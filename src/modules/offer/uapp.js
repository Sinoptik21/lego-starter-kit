export default (ctx) => {
  return {
    init() {
      this.components = require('./components').default(ctx);
      this.stores = require('./mobx').default(ctx, this);
      this.router = require('./router').default;//(ctx, this);
    },
  };
};
