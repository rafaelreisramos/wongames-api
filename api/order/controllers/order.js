'use strict';

const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  create: async (ctx) => {
    const { cart, paymentIntentId } = ctx.request.body;

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

    console.log(totalInCents);

    const entry = {
      user,
      games,
      payment_intent_id: paymentIntentId,
      total_in_cents: totalInCents,
      card_brand: null,
      card_last4: null,
    };

    const entity = await strapi.services.order.create(entry);

    return sanitizeEntity(entity, { model: strapi.models.order });
  },
};
