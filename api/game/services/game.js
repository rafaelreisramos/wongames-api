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

  console.log(name.trim())
  console.log(item)

  if (!item) {
    return await strapi.services[entityName].create({
      name: name.trim(),
      slug: slugify(name, { lower: true })
    })
  }
}

module.exports = {
  populate: async (params) => {
    const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity`

    const { data: { products } } = await axios.get(gogApiUrl)

    await create(products[1].publisher, 'publisher')
  }
};
