module.exports = ({ env }) => ({
  host: env('HOST'),
  port: env.int('PORT'),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'e26f49b57b6a93395bd8ca2c31f4fe72'),
    },
  },
});
