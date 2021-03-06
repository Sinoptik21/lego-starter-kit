import _ from 'lodash';
import UniversalRouter from 'universal-router';
import Core from '../Core';
import Page from './Page';
import Api from 'apiquery';
import cloneDeep from 'lodash/cloneDeep';

// TODO: вынести функции работы с хостнеймом куда нибудь
function isRightHostname(hostnames = [], hostname) {
  for (const name of hostnames) {
    // @TODO: check wildcards
    // console.log('===', name, hostname, name === '*');
    if (name === '*') return true;
    if (name === hostname) return true;
  }
  return false;
}

function findConfigByHostname(configs, hostname) {
  for (const config of configs) {
    if (config.hostnames && isRightHostname(config.hostnames, hostname)) {
      return config;
    }
    // console.log('isRightHostname(config.hosts, hostname)', isRightHostname(config.hosts, hostname));
    if (config.hosts && isRightHostname(config.hosts, hostname)) {
      // console.log('RETURN', config);
      return config;
    }
  }
  return {};
}

function getSiteConfig(props) {
  const config = props.config || {};
  const hostname = props.req.hostname;
  let siteConfig = config.site || {};
  // console.log({hostname, siteConfig});
  if (config.sites && Array.isArray(config.sites)) {
    const findedConfig = findConfigByHostname(config.sites, hostname);
    // console.log({findedConfig});
    if (findedConfig) {
      siteConfig = _.merge({}, siteConfig, findedConfig);
    }
  }
  // console.log({siteConfig});
  return siteConfig;
}


// TODO: вынести функции куда нибудь
function resolveCtxRoutes(routes, ctx) {
  function resolveCtxRoute(initRoutes) {
    let routes = initRoutes; // eslint-disable-line
    if (typeof routes === 'function') {
      routes = routes(ctx) || {};
    }
    if (routes.children) {
      routes.children = routes.children.map(resolveCtxRoute);
    }
    return routes;
  }
  const resultRoutes = resolveCtxRoute(routes);
  return resultRoutes;
}


export default class Uapp extends Core {
  name='Uapp';
  Page = Page;
  Api = Api;

  async init(props = {}) {
    await super.init();
    this.config = this.getConfig(this);
    this.initConfig = cloneDeep(this.config); // подумать в init или в run
    // TODO: прокинуть домен (req) когда сервер
    this.api = new this.Api(this.config && this.config.api || {});
    // this.log = this.getLogger();
  }

  async run(props = {}) {
    await super.run();
    this.routes = resolveCtxRoutes(this.getRoutes(), this);
  }


  getConfig(props) {
    const site = getSiteConfig(props);
    // console.log({site});
    return {
      ...props.config,
      site,
    };
  }

  getRoutes() {
    // console.log('getRoutes ********* ');
    return {};// require('../ReactApp/routes').default;
  }

  resetPage() {
    if (!this.page) {
      this.page = new this.Page();
    }
    this.page.init({
      uapp: this,
    });
    return this.page;
  }


  // return page for req
  async resolve(reqParams = {}) {
    const req = Api.createReq(reqParams);
    // console.log('Uapp.resolve', req);
    this.resetPage();
    const page = await UniversalRouter.resolve(this.routes, {
      ...this.provide(),
      path: reqParams.path,
      query: reqParams.query,
      req,
    });
    if (__CLIENT__) {
      document.body.scrollTop = 0; // @TODO: back
      document.title = page.renderFullTitle();
      // @TODO: to @natavts favicon, meta tags
    }
    // if (page._page) throw '!page';
    return page;
  }

  provide() {
    return {
      uapp: this,
      log: this.log,
      config: this.config,
      page: this.page,
      api: this.api,
    };
  }
}
