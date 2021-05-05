'use strict';

const { sanitizeEntity } = require("strapi-utils");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  create: async (ctx) => {
    const { cart, paymentIntentId, paymentMethod } = ctx.request.body;

    const token = await strapi.plugins[
      "users-permissions"
    ].services.jwt.getToken(ctx);

    const userId = token.id;
    const user = await strapi
      .query("user", "users-permissions")
      .findOne({ id: userId});

    const cartGamesIds = await strapi.config.functions.cart.cartGamesIds(cart);

    const games = await strapi.config.functions.cart.cartItems(cartGamesIds);
    const totalInCents = await strapi.config.functions.cart.cartTotal(games);

    let paymentInfo;
    if (totalInCents !== 0) {
      try {
        paymentInfo = await stripe.paymentMethods.retrieve(paymentMethod);
      } catch (err) {
        ctx.response.status = 402;
        return { error: err.message };
      }
    }

    const entry = {
      user,
      games,
      payment_intent_id: paymentIntentId,
      total_in_cents: totalInCents,
      card_brand: paymentInfo?.card?.brand,
      card_last4: paymentInfo?.card?.last4,
    };

    const entity = await strapi.services.order.create(entry);

    return sanitizeEntity(entity, { model: strapi.models.order });
  },
};
