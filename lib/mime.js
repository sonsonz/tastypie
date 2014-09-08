/*jshint laxcomma: true, smarttabs: true*/
/*globals module,process,require,exports,__dirname,__filename */
'use strict';
/**
 * Small libe for dealing with negotiation of mime types.
 * @module mime
 * @author Eric Satterwhite
 * @since 0.0.1
 * @requires accepts
 * @requires mout/array/intersection
 */

var accepts = require( 'accepts' )
  , intersection = require( 'mout/array/intersection' )
  , formats 
  ;

/**
 * DESCRIPTION
 * @method NAME
 * @param {Request} NAME
 * @param {Array} [types] an array of allowable content types
 * @return
 **/
exports.determine = function( req, types ){

	types = Array.isArray( types ) && types.length ? types : null

	var accept = accepts( req )
	  , allowed = types || accept.types()
	  , format  = ;

	return intersection( accept.types(), allowed );
}