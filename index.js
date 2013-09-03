'use strict';

var fs = require('fs'),
    path = require('path'),
    http = require('http'),
    _ = require('underscore'),
    express = require('express');

var ExpressHelpers = function ExpressHelpers(options) {
    var app = express(),
        server = http.createServer(app);

    this.options = _.extend({
        app: app,
        server: server
    }, options);
    this.expressConfig = [];
    this.expressRoutes = [];
};

ExpressHelpers.prototype.pathhost = function pathhost(urlpath, server) {
    if (!urlpath) {
        throw new Error('pathhost urlpath required');
    }
    if (!server) {
        throw new Error('pathhost server required');
    }
    return function pathhost(req, res, next) {
        if (req.url === '/') {
            return next();
        }
        console.log(req.url.indexOf(urlpath));
        if (req.url.indexOf(urlpath) < 0) {
            return next();
        }
        if ('function' === typeof server) {
            return server(req, res, next);
        }
        server.emit('request', req, res);
    };
};

ExpressHelpers.prototype.registerConfig = function registerConfig(useArgs, priority) {
    priority = priority || 10;
    useArgs = (useArgs instanceof Array) ? useArgs : [useArgs];
    this.expressConfig.push([priority, useArgs]);
};

ExpressHelpers.prototype.applyConfig = function applyConfig() {
    this.expressConfig = _.sortBy(this.expressConfig, function (config) {
        // sort by priority
        return config[0];
    });

    this.options.app.configure(function () {
        _.each(this.expressConfig, function (config) {
            this.options.app.use.apply(this.options.app, config[1]);
        }.bind(this));
    }.bind(this));
};

ExpressHelpers.prototype.registerRoute = function registerRoute(verb, route, handler, priority) {
    priority = priority || 10;
    this.expressRoutes.push([priority, verb, route, handler]);
};

ExpressHelpers.prototype.registerRoutes = function registerRoutes(routes, baseURL) {
    baseURL = baseURL || '';

    // itterate through each list of routes by method (verb)
    _.each.call(this, routes, function (list, verb) {
        // assign url route handler to route
        _.each(list, function (handler, route) {
            this.registerRoute(verb, path.join(baseURL, route), handler);
        }.bind(this));
    }.bind(this));
};

ExpressHelpers.prototype.registerRoutesByFile = function registerRoutesByFile(routesPath, baseURL) {
    baseURL = baseURL || '';

    if (!fs.existsSync(routesPath)) {
        throw new Error('registerRoutesByFile routesPath file does not exist ' + routesPath);
    }
    var routesFile = require(routesPath);
    if (!routesFile.routes) {
        throw new Error('registerRoutesByFile routes method missing within route file ' + routesPath);
    }
    var routes = routesFile.routes(this.options) || {};
    this.registerRoutes(routes, baseURL);
};

ExpressHelpers.prototype.applyRoutes = function applyRoutes() {
    this.expressRoutes = _.sortBy(this.expressRoutes, function (config) {
        // sort by priority
        return config[0];
    });

    _.each(this.expressRoutes, function (config) {
        this.options.app[config[1]](config[2], config[3]);
    }.bind(this));
};

module.exports = exports = ExpressHelpers;
