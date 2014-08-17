/*jshint laxcomma:true, smarttabs: true */
'use strict';
/**
 * DESCRIPTION
 * @module NAME
 * @author Eric Satterwhite
 * @requires Class
 * @requires module:class/meeta
 * @requires mout
 **/
var  Class = require( './class' ) // this is Class
   , mout = require( 'mout' ) // custom mout
   , Meta = require( './class/meta' )
   , util = require('util')
   , startsWithSlash = /^\//
   , endsWithSlash = /\/$/
   , trailingSlashes = /^\/|\/$/g
   , Api
   ;
/**
 * Class which maps a url prefix to an API resource
 * @class module:NAME.Api
 * @param {TYPE} NAME DESCRIPTION
 * @example var x = new NAME.Api({});
 */
Api = Class( /** @lends module:NAME.Api.prototype */{
	mixin: Meta
	,meta:{
		DEFAULT_LIMIT:20
		,MAX_LIMIT:500
	}
	,constructor: function( path, app ){
		// this.setMeta( app.settings.api )
		this.app = app;
		this.basepath = this.normalizePath( path );
		this.baseexp = new RegExp( "^" + this.basepath )
		this.app.all( this.basepath, this.handler.bind( this ) );
		
		this.api_cache = [];

		// defines a quick url look up per API object
		// it is cached on first call until another
		// resource is registered
		Object.defineProperties(this,{
			urls:{
				get: function(){
					var route;
					if( !this.api_cache.length ){
						for( var x=0; x<this.app._router.stack.length; x++ ){
							route = this.app._router.stack[x].route
							if( route && this.baseexp.test( route.path )) {
								this.api_cache.push( this.app._router.stack[x].route.path )
							}
						}
					}
					return this.api_cache;
				}
			}
		})
	}

	/**
	 * This does someApi
	 * @param {TYPE} name DESCRPTION
	 * @param {TYPE} name DESCRIPTION
	 * @returns {TYPE} DESCRIPTION
	 */ 
	 ,register: function(prefix, resource){
		 this.app.use( util, resource )
		 this.api_cache.length = 0;
	 }

	/**
	 * This does someApi
	 * @param {TYPE} name DESCRPTION
	 * @param {TYPE} name DESCRIPTION
	 * @returns {TYPE} DESCRIPTION
	 */ 
	 ,generate: function(req, res, next) {

	 }

	/**
	 * This does someApi
	 * @param {TYPE} name DESCRPTION
	 * @param {TYPE} name DESCRIPTION
	 * @returns {TYPE} DESCRIPTION
	 */ 
	 ,normalizePath: function( path ){
		return util.format( 
			'/%s'
			, path.replace(trailingSlashes,'')
		)
	 }

	 ,handler: function( req, res, next ){
	 	res.send(201, "global hander\n")
	 }
});
 
module.exports = Api;