'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

const axios = require('axios')
const slugify = require('slugify')
const qs = require('querystring')

function Exception(e) {
  return { e, data: e.data && e.data.errors && e.data.errors }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getGameInfo(slug) {
  try {
    const jsdom = require('jsdom')
    const { JSDOM } = jsdom

    const body = await axios.get(`https://www.gog.com/game/${slug}`)
    const dom = new JSDOM(body.data)

    const description = dom.window.document.querySelector('.description')

    return {
      rating: 'BR0',
      short_description: description.textContent.trim().slice(0, 160),
      description: description.innerHTML
    }
  } catch (errors) {
    console.log('getGameInfo', Exception(errors))
  }
}

async function getByName(name, entityName) {
  const item = await strapi.services[entityName].find({ name: name.trim() })

  return item.length ? item[0] : null
}

async function create(name, entityName) {
  const item = await getByName(name, entityName)

  if (!item) {
    return await strapi.services[entityName].create({
      name: name,
      slug: slugify(name, { lower: true })
    })
  }
}

async function createManyToManyData(products) {
  const developers = new Set()
  const publishers = new Set()
  const categories = new Set()
  const platforms = new Set()

  products.forEach((product) => {
    const { developer, publisher, genres, supportedOperatingSystems } = product

    genres?.forEach((genre) => {
      categories.add(genre.trim())
    })

    supportedOperatingSystems?.forEach((platform) => {
      platforms.add(platform.trim())
    })

    developers.add(developer.trim())
    publishers.add(publisher.trim())
  })

  return Promise.all([
    ...Array.from(developers).map((developer) => create(developer, 'developer')),
    ...Array.from(publishers).map((publisher) => create(publisher, 'publisher')),
    ...Array.from(categories).map((category) => create(category, 'category')),
    ...Array.from(platforms).map((platform) => create(platform, 'platform'))
  ])
}

async function setImage({ image, game, field = 'cover'}) {
  try {
    const url = `https:${image}_bg_crop_1680x655.jpg`
    const { data } = await axios.get(url, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(data, 'base64')

    const FormData = require('form-data')
    const formData = new FormData()

    formData.append('refId', game.id)
    formData.append('ref', 'game')
    formData.append('field', field)
    formData.append('files', buffer, { filename: `${game.slug}.jpg` })

    console.info(`Uploading ${field} image: ${game.slug}.jpg`)

    await axios({
      method: 'POST',
      url: `http://${strapi.config.host}:${strapi.config.port}/upload`,
      data: formData,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
      }
    })
  } catch (errors) {
    console.log('setImage', Exception(errors))
  }
}

async function createGames(products) {
  return Promise.all(
    products.map(async (product) => {
      const item = await getByName(product.title, 'game')

      if (!item) {
        console.info(`Creating: ${product.title}...`)

        const game = await strapi.services.game.create({
          name: product.title,
          slug: product.slug.replace(/_/g, '-'),
          price: product.price.amount,
          release_date: new Date(
            Number(product.globalReleaseDate) * 1000
          ).toISOString(),
          categories: await Promise.all(
            product.genres.map((category) => getByName(category, 'category'))
          ),
          platforms: await Promise.all(
            product.supportedOperatingSystems.map((platform) => getByName(platform, 'platform'))
          ),
          developers: [await getByName(product.developer, 'developer')],
          publisher: await getByName(product.publisher, 'publisher'),
          ...await(getGameInfo(product.slug))
        })

        await setImage({ image: product.image, game })
        await Promise.all(
          product.gallery
            .slice(0, 5)
            .map(url => setImage({ image: url, game, field: 'gallery' }))
        )

        await timeout(2000)

        return game
      }
    })
  )
}

module.exports = {
  populate: async (params) => {
    try {
      const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&${qs.stringify(params)}`

      const { data: { products } } = await axios.get(gogApiUrl)

      await createManyToManyData(products)
      await createGames(products)
    } catch (error) {
      console.log('populate', Exception(error))
    }
  }
};
