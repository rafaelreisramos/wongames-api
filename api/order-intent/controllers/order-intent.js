'use strict';

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  create: async (ctx) => {
    const { cart } = ctx.request.body;

    let games = [];

    await Promise.all(
      cart?.map(async (game) => {
        const validatedGame = await strapi.services.game.findOne({
          id: game.id,
        })

        if(validatedGame) {
          games.push(validatedGame);
        }
      })
    )

    if(!games.length) {
      ctx.response.status = 404;
      return {
        error: "No valid games found!",
      }
    }

    const amount = games.reduce((acc, game) => {
      return acc + game.price
    }, 0);

    if (amount === 0) {
      return {
        freeGames: true,
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
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
