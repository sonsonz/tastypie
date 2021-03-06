/*jshint laxcomma:true, smarttabs: true, node: true, eqnull:true, esnext: true, forin: false */
'use strict';
/**
 * Provides standard data serialization & deserialization functionality
 * @module tastypie/lib/serializer
 * @author Eric Satterwhite
 * @since 0.1.0
 * @requires xml2js
 * @requires jstoxml
 * @requires events
 * @requires util
 * @requires debug
 * @requires tastypie/lib/class
 * @requires tastypie/lib/class/options
 * @requires mout/lang/kindOf
 * @requires prim-util/prime/parentize
 * @requires mout/lang/isObject
 * @requires tastypie/lib/utility
 * @requires tastypie/lib/exceptions
 **/

var  xml2js        = require( 'xml2js' )
  , jstoxml        = require( 'jstoxml' )
  , events         = require( 'events' )
  , util           = require( 'util' )
  , boom           = require( 'boom' )
  , kindOf         = require( 'mout/lang/kindOf' )
  , isObject       = require( 'mout/lang/isObject' )
  , isString       = require( 'mout/lang/isString' )
  , isFunction     = require( 'mout/lang/isFunction' )
  , toArray        = require( 'mout/lang/toArray' )
  , map            = require( 'mout/object/map' )
  , debug          = require( 'debug')('tastypie:serializer' )
  , Mime           = require( './mime' )
  , Class          = require( './class' )
  , Options        = require( './class/options' )
  , Parent         = require( './class/parent' )
  , exceptions     = require( './exceptions' )
  , createCallback = require( './utility' ).createCallback
  , Serializer
  ;

const TOP_LEVEL      = "response"
	, OBJECT         = "object"
	, OBJECTS        = "objects"
	, VALUE          = "value"
	, FUNCTION       = 'function'
	, ARRAY          = 'array'
	;
	



/**
 * @constructor
 * @tutorial serializers
 * @alias module:tastypie/lib/serializer
 * @param {Object} [options] Serializer instance options options
 * @param {String} [options.callbackKey=callback] callback key to be used for jsop responsed
 * @param {String} [options.defaultFormat='application/json'] the default serialziion format if one is not specified
 * @param {Object} [options.xml] configuration objects for xml serialization vis xml2js
 * @param {Boolean} [options.xml.strict=false] if set to true, arrays will be serialize as a repeating elements with the same tag name.
 * When set to false, arrays are serialized as an object of type array with repeating elements
 * @param {Object} [options.content_types] A mapping of Content Type header names to short formats ie `{ 'text/xml': 'xml' }`
 * @example serializer = new require("tastypie/lib/serializer")();
serializer.serialize({key:value}, "text/xml", null, console.log );
 * @example
 * // define new acceptable content types & formats
 * FakeSerializer = new tastypie.Class({
 * 		inherits:Serializer
 *   	,options:{
 * 			content_types:{
 *   			'application/vnd+fakescript':['fake', 'vnd-fake']
 * 			}
 *		}
 *
 *   	,constructor: function( options ){
 *    		this.setOptions( options )
 *		}
 * 		,to_fake: function(data, callback){ ... }
 *   	,from_fake:function(data,callback){ ... }
 * });
 * // ?format=fake
 */
Serializer = new Class({
	mixin:[ Options, Parent ]
	,options:{
		callbackKey:'callback'
		,defaultFormat:"application/json"
		,xml:{
			explicitCharKey : false
		  , trim            : true
		  , normalize       : false
		  , explicitArray   : false
		  , explicitRoot    : false
		  , ignoreAttrs     : true
		  , mergeAttrs      : false
		  , validator       : null
		  , timeout         : 20000
		  , strict          : true
		}
		, content_types :{
			'application/json':'json'
			,'text/javascript':'jsonp'
			,'text/xml':'xml'
		}
	}
	,constructor:function( options ){
		this.setOptions( options );
		const _parser = new xml2js.Parser( this.options.xml );
		const _mime = new Mime();
		_mime.default_type = null;

		Object.defineProperties(this,{
			_mime:{
				enumerable: false
				,configurable: false
				,get: function(){
					return _mime;
				}
			}
			,_parser:{
				enumerable: false
				,configurable: false
				,get: function(){
					return _parser;
				}
			}
		});

		this._mime.define(
			map( this.options.content_types, function( val, key, obj){
				return toArray( val );
			})
		);
	}

	/**
	 * Serialized an object into a string of a specified format
	 * @method module:tastypie/lib/serializer#serialize
	 * @param {Object} data The data object to be serialized into a string
	 * @param {String} format The format to serialize the object down to
	 * @param {Function} callback A callback function to be called when serialization is complete
	 * @throws SerializationError
	 **/
	,serialize:function( data, format, callback ){
		var method_name
		  , desired_format
		  , mime
		  , _data
		  , _format
          , _cb
		  ;

		_data          = data || '';
		mime           = this._mime;
		_format = isString( format ) ? format : this.options.defaultFormat;
        _cb     = createCallback(...arguments); 

		// if It is already a string
		// there is nothing to serialize
		if( isString( _data ) ){
			return _cb( null, _data );
		}

		desired_format = mime.extension( _format );
	  	method_name = `to_${desired_format}`;
		if( typeof this[method_name] === 'function'){
			return this[method_name]( _data, _cb );
		}

		_cb( boom.unsupportedMediaType(`unsupported format ${desired_format}` ), null );
	}

	,convertFormat: function convertFormat( format ){
		return this._mime.lookup( format ) || null;
	}

	/**
	 * Converts a data string into a javascript object based on a specified content type
	 * @method module:tastypie/lib/serializer#deserialize
	 * @param {String} Data string to convert into an object
	 * @param {String} contentType the content type of the string to be deserialzie
	 * @param {Function} callback a function to call when deserialization is complete
	 **/
	,deserialize: function(data={}, format=this.options.defaultFormat, ...args ){
		var desired_format
		  , method_name
		  , mime
          , callback
		  ;

		mime     = this._mime;
		format   = isString( format ) ? format : this.options.defaultFormat;
		callback = createCallback( ...args );
		if( isObject( data ) ){
			return callback( null, data );
		}

		desired_format = mime.extension( format );
	  	method_name    = `from_${desired_format}`;

		if( isFunction( this[method_name] ) ){
			return this[method_name]( data, callback );
		}

		callback( boom.unsupportedMediaType(`unsupported format ${desired_format}`), null );
	}

	/**
	 * Converts an object into a valid JSON string
	 * @method module:tastypie/lib/serializer#to_json
	 * @param {String} json valid json string to parse into an object
	 * @param {Function} callback callback function to call when deserialization is complete
	 **/
	,to_json:function( data, callback ){
		setImmediate(function(err){
			callback(err, JSON.stringify( data ) );
		});
	}

	/**
	 * Converts a json string into an object
	 * @method module:tastypie/lib/serializer#from_json
	 * @param {String} json valid json string to parse into an object
	 * @param {Function} callback callback function to call when deserialization is complete
	 **/
	,from_json: function( data, callback ){
		setImmediate(function(err){
			callback( err, JSON.parse( data, null, 2 ) );
		});
	}

	/**
	 * Converts an object to an xml string
	 * @method module:tastypie/lib/serializer#to_xml
	 * @param {String} data object to convert into an xml string
	 * @param {Function} callback callback function to call when deserialization is complete
	 **/
	,to_xml: function( data, callback ){
		setImmediate((err)=>{
			callback(err, data == null ? data : jstoxml.toXML( this.to_jstree( data) , {header:true, indent:" "} ) );
		});
	}

	/**
	 * converts an xml string into an object
	 * @method module:tastypie/lib/serializer#from_xml
	 * @param {String} xml valid xml string to parse into an object
	 * @param {Function} callback callback function to call when deserialization is complete
	 **/
	,from_xml: function( data, callback ){
		this._parser.parseString(data, callback);
	}

	/**
	 * Generates a tree of for xml serialization
	 * @private
	 * @method module:tastypie/lib/serializer#to_jstree
	 * @return {Object} An xml root element with sub tree
	 **/
	,to_jstree: function( data, name, depth, element){
		let _data = data || '';
		depth = depth == null ? 0 : depth;
		if(typeof _data.toJSON === 'function' ){
			_data = _data.toJSON();
		}
		if(typeof _data.toObject === 'function' ){
			_data = _data.toObject();
		}
		var data_type = kindOf( _data ).toLowerCase();

		switch( data_type ){
			case ARRAY:
				if( this.options.xml.strict ){
					element = [];
					for(let idx=0,len = _data.length; idx < len; idx++){
						element.push( this.to_jstree( _data[idx], name, depth+1 ) );
					}
				} else{
					element = {
						_name: name || OBJECTS
						,_attrs:{
							type:ARRAY
						}
						,_content:[]
					};

					for(let item of _data){
						element._content.push( this.to_jstree( item, null, depth+1 ));
					}
				}

				break;

			case OBJECT:
				if(depth === 0){
					element = {
						_name:TOP_LEVEL
						,_content:[]
					};

				} else {
					name = name || OBJECT;
					element = {
						_content:[]
						,_name:name
						,_attrs:{
							type:OBJECT
						}
					};
					if( name !== data_type ){
						element._attrs.type = data_type;
					}
				}
				for( let key in _data ){
					element._content.push( this.to_jstree( data[key], key, depth+1, element ) );
				}
				break;
			case FUNCTION:
				let result = data();
				element = {
					_attrs:{
						type:kindOf( result ).toLowerCase()
					}
					,_content: String( result )
					,_name: name || VALUE
				};
				break;
			default:
				element = {
					_attrs:{
						type: data_type
					}
					,_content: String( _data )
					,_name: name || VALUE
				};
				break;
		}
		return element;
	}

	/**
	 * Converts an object in to a jsonp string
	 * @method module:tastypie/lib/serializer#to_jsonp
	 * @param {Object} data data object to serialzie
	 * @param {Function} callback a callback function to call when serialization is complete. Must accept an error object and data payload
	 **/
	,to_jsonp:function( data, callback ){
		setImmediate(function(err){
			callback(err
				, util.format(
					"%s(%j)"
						.replace('\u2028', '\\u2028')
						.replace('\u2029', '\\u2029')
					, (this.options.callbackKey)
				, data )
			);
		}.bind( this ),0);
	}
});


Object.defineProperties(Serializer.prototype,{
	types: {
		get: function(){
			var types = this.options.content_types;
				return Object.keys( types ).filter(function( key ){
					return !!types[ key ];
				});
		}
	}
});
module.exports           = Serializer;

