'use strict';

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  create: async (ctx) => {
    const { cart } = ctx.request.body;

    const cartGamesIds = await strapi.config.functions.cart.cartGamesIds(cart);

    const games = await strapi.config.functions.cart.cartItems(cartGamesIds);

    if(!games.length) {
      ctx.response.status = 404;
      return {
        error: "No valid games found!",
      }
    }

    const amount = await strapi.config.functions.cart.cartTotal(games)

    if (amount === 0) {
      return {
        freeGames: true,
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        metadata: {},
      });

      return paymentIntent;
    } catch (err) {
      return {
        error: err.raw.message,
      };
    }
  }
};
