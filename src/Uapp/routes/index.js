import ErrorLayout from './ErrorLayout';
import MainLayout from './MainLayout';

export default uapp => ({
  path: '/',
  async action({ next, uapp, page }) {
    return page
    .meta(uapp.config && uapp.config.site || {})
    .layout(MainLayout)
    .errorLayout(ErrorLayout)
    .next(next);
  },
  children: [
    {
      path: '/',
      ...require('./home').default,
    },
    {
      path: '/auth',
      ...uapp.modules.auth.router,
    },
    {
      path: '/cabinet',
      ...require('./cabinet').default(uapp),
    },
    {
      path: '/demo',
      ...require('./demo').default,
    },
    {
      path: '/admin',
      ...require('./admin').default,
    },
    {
      path: '*',
      action() {
        throw 'Not found';
      },
    },
  ],
});
