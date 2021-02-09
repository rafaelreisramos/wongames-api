'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

const axios = require('axios')
const slugify = require('slugify')

async function getGameInfo(slug) {
  const jsdom = require('jsdom')
  const { JSDOM } = jsdom

  const body = await axios.get(`https://www.gog.com/game/${slug}`)
  const dom = new JSDOM(body.data)

  const description = dom.window.document.querySelector('.description')

  return {
    rating: 'BR0',
    short_description: description.textContent.slice(0, 160),
    description: description.innerHTML
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
    ...[...developers].map((developer) => create(developer, 'developer')),
    ...[...publishers].map((publisher) => create(publisher, 'publisher')),
    ...[...categories].map((category) => create(category, 'category')),
    ...[...platforms].map((platform) => create(platform, 'platform'))
  ])
}

module.exports = {
  populate: async (params) => {
    const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity`

    const { data: { products } } = await axios.get(gogApiUrl)

    await createManyToManyData(products)
  }
};
