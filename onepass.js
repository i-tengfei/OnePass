var onePass;

function OnePass( options ){

    this.__defineSetter__( 'delay', function( ){

        var t;

        return function( delay ){

            // 检测时间并清除key
            t && clearInterval( t );
            t = setInterval( function( ){

                delete this.__key;

            }.bind( this ), delay * 60 * 1000 );

            OnePass.set( {
                delay: delay
            } );

        }

    }( ) );

    this.__defineSetter__( 'assets', function( assets ){

        if( !!assets ){
            this.__assets = assets;
            this.modified = Date.now( );
            OnePass.set( {OnePass: JSON.stringify( assets )} );
        }

    } );

    this.__defineGetter__( 'assets', function( ){

        return this.__assets;

    } );

    this.__defineSetter__( 'modified', function( t ){
        this.__modified = t;
        OnePass.set( {modified: t} );
    } );

    this.__defineSetter__( 'ruler', function( r ){
        this.__ruler = r;
        OnePass.set( {ruler: JSON.stringify( r )} );
    } );

    options = options || {};

    this.ruler = options.ruler || $.ajax( {
        url: 'ruler.json',
        dataType: 'JSON',
        async: false
    } ).responseJSON;

    this.delay = options.delay || 10;
    this.assets = options.assets || null;
    this.modified = options.modified || Date.now( );


    this.weibo = new OAuth2( 'weibo', {
        client_id: '1376463612',
        client_secret: 'bb686fee292baaad137722ab76000389'
    } );
    this.vdisk = null;


    chrome.runtime.onMessage.addListener( function( req, sender, sendResponse ) {

        if( req.url ){
            var type = this.check( req.url ),
                accounts = type && _.filter( this.assets.accounts, function( x ){
                    return x.passtype === type.id;
                } );
            sendResponse( { type: type, accounts: accounts } );
        }

        if( req.addAccount ){
            this.addAccount( req.addAccount, function( ){
                sendResponse( );
            } );
        }

        if( req.checkOnePass ){
            this.checkOnePass( req.checkOnePass, function( b ){
                sendResponse( b )
            } );
        }

        if( req.decrypt ){
            this.decrypt( req.decrypt, function( pass ){
                sendResponse( pass )
            } );
        }

        return true;

    }.bind( this ) );

}

OnePass.create = function( options ){
    onePass = new OnePass( options );
};

OnePass.set = function( items, callback ){

    var localStorage = window.localStorage;

    // 存储至本地
    Object.keys( items ).forEach( function( name ){
        localStorage.setItem( name, items[ name ] );
    } );

    chrome.storage.sync.set( items, callback );

};

OnePass.get = function( items, callback ){

    var localStorage = window.localStorage;

    if( typeof items === 'string' ){
        items = [ items ];
    }

    if( Array.isArray( items ) ){
        var r = {};
        items.forEach( function( x ){
            r[ x ] = undefined;
        } );
        items = r;
    }

    chrome.storage.sync.get( items, function( results ){

        // 本地检测
        Object.keys( items ).forEach( function( name ){
            
            var local = localStorage.getItem( name ),
                cloud = results[ name ];

            if( local !== cloud ){
                if( local === undefined ){
                    localStorage.setItem( name, cloud );
                }else if( results[ name ] === undefined ){
                    results[ name ] = local;
                    OnePass.set( results );
                }
            }

        } );

        callback( results );

    } );

};

OnePass.openPotionsPage = function( ){

    var options = chrome.extension.getURL( 'options.html' );

    chrome.tabs.query( {

        url: options,

    }, function( results ) {

        if ( results.length ){
            chrome.tabs.update( results[ 0 ].id, { active: true } );
        }else{
            chrome.tabs.create( { url: options } );
        }

    } );

};

OnePass.salt = 'OnePass + &^8(%$. 0!-';

OnePass.secretWeibo = 'bb686fee292baaad137722ab76000389';

OnePass.prototype = {

    constructor: OnePass,

    addAccount: function( account, callback ){
        this.encrypt( account.password, function( pw ){
            account.password = pw;
            // TODO: 验证名称是否相同
            this.__assets.accounts[ account.passname ] = account;
            this.assets = this.__assets;
            callback( );
        }.bind( this ) );
    },

    check: function( u ){

        var domain = url( 'domain', u ),
            ruler = this.__ruler;

        var site = _.find( ruler.apps, function( x ){
            return !!_.find( x.web.domains, function( x ){
                return x === domain;
            } );
        } );

        site = site && site.web;

        var checks = [
            function( x ){
                return x.url === u;
            },
            function( x ){
                return url( 'hostname', x.url ) === url( 'hostname', u );
            },
            function( x ){
                return url( 'domain', x.url ) === url( 'domain', u );
            }
        ];

        function x( i ){
            var t = _.find( site.urls, checks[ i ] );
            if( t ){
                return _.find( ruler.types.web, function( x ){
                    return x.id === t.type;
                } );
            }else{
                if( i < checks.length-1 ){
                    return x( ++i );
                }
            }
        }

        if( site ){
            return x( 0 );
        }


    },

    checkOnePass: function( password, callback ){

        this.generateKey( password );
        this.decrypt( this.assets.accounts.OnePass, function( str ){
            if( str !== password ){
                delete this.__key;
                callback( false );
            }else{
                callback( true );
            }
        }.bind( this ) );

    },

    initVdisk: function( callback ){

        var weibo = this.weibo,
            vdisk = this.vdisk = new Vdisk( {
            token: weibo.getAccessToken( )
        } ),
            sync = this.sync.bind( this );
        // 检查是否有 OnePass记录，没有则创建新记录
        // vdisk.delete( '/OnePass/OnePass.ops', function( ){

            vdisk.metadata( function( data ){

                if( data.contents.length && data.contents.some( function( x ){ return x.path === '/OnePass' } ) ){
                    sync( callback );
                }else{
                    vdisk.createFolder( '/OnePass', function( data ){
                        sync( callback );
                    } );
                }

            } );

        // } );



        vdisk.on( 'clearToken', function( ){
            weibo.clearAccessToken( );
        } );

    },

    deleteCloud: function( callback ){

        this.vdisk.delete( '/OnePass/OnePass.ops', callback )

    },

    sync: function( callback ){

        var vdisk = this.vdisk,
            assets = this.__assets;
        
        var __this__ = this;

        vdisk.metadata( '/OnePass?' + Math.random( ), function( data ){

            var hasCloud = data.contents.length && _.find( data.contents, function( x ){ return x.path === '/OnePass/OnePass.ops' } ),
                hasLocal = !!assets;

            if( hasCloud && hasLocal ){
                // 云端和本地均有
                vdisk.file( '/OnePass/OnePass.ops', function( data ){

                    if( data === JSON.stringify( assets ) ){
                        // 数据相同
                        callback && callback( );
                    }else{
                        // 数据不同
                        console.log( 'TODO: 云端数据与本地数据不同步！' );
                        callback && callback( );
                    }

                } );

            }else if( hasCloud ){
                // 仅云端有
                console.log( 2 );
                vdisk.file( '/OnePass/OnePass.ops', function( data ){
                    __this__.assets = JSON.parse( data );
                    __this__.modified = Date.now( );
                    callback && callback( );
                } );

            }else if( hasLocal ){
                // 仅本地有
                console.log( 3 );
                vdisk.upload( '/OnePass/OnePass.ops', new Blob( [ JSON.stringify( __this__.assets ) ], { type: 'text/plain' } ), function( data ){
                    __this__.modified = new Date( data.modified );
                    callback && callback( );
                } );

            }else{
                // 云端和本地均没有
                console.log( 4 );
                __this__.assets = {
                    accounts: {}
                };
                __this__.modified = Date.now( );

                vdisk.upload( '/OnePass/OnePass.ops', new Blob( [ JSON.stringify( __this__.assets ) ], { type: 'text/plain' } ), function( data ){
                    __this__.modified = new Date( data.modified );
                    callback && callback( );
                } );

            }

        } );
    },

    generateKey: function( password ){

        this.__key = cryptico.generateRSAKey( md5( password + md5( OnePass.salt ) ), 1024 );
        return this.__key;

    },

    initPassword: function( pw ){

        this.generateKey( pw );
        this.encrypt( pw, function( str ){
            this.assets.accounts.OnePass = str;
            this.assets = this.assets;
        }.bind( this ) );

    },

    authorize: function( callback ){

        var __this__ = this;
        chrome.tabs.query( { active: true, currentWindow: true } , function( tabs ) {
            chrome.tabs.sendMessage( tabs[0].id, { authorize: 'OnePass' }, function( res ) {
                callback( );
            } );  
        } );

    },

    encrypt: function( str, callback ){

        if( this.__key ){
            callback( cryptico.encrypt( str, cryptico.publicKeyString( this.__key ) ).cipher );
        }else{
            this.authorize( this.encrypt.bind( this, str, callback ) );
        }

    },

    decrypt: function( str, callback ){

        if( this.__key ){
            callback( cryptico.decrypt( str, this.__key ).plaintext );
        }else{
            this.authorize( this.decrypt.bind( this, str, callback ) );
        }

    },

    authorizeWeibo: function( done, fail ){

        var weibo = this.weibo;

        weibo.clearAccessToken( );
        weibo.authorize( function( ){
            
            if( weibo.hasAccessToken( ) ){
                done && done( weibo );
            }else{
                fail && fail( weibo );
            }

        } );

    }

};

Events.mixTo( OnePass );

OnePass.get( [ 'OnePass', 'modified', 'delay', 'ruler' ], function( items ){

    if( !!items.OnePass ){

        OnePass.create( {
            delay: items.delay,
            modified: items.modified,
            ruler: JSON.parse( items.ruler ),
            assets: JSON.parse( items.OnePass )
        } );

    }else{

        OnePass.create( );
        OnePass.openPotionsPage( );

    }

} );