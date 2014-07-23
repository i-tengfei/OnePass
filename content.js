$( function( ){

    function addAccount( type ){

        var accountStr = [
            '<div id="onepass-addaccount">',
                '<h3>添加新账户</h3>',
                '<p>OnePass 检测到您正在访问<span class="onepass-typename">' + type.name + '</span>, 但 OnePass 暂未保存该网站账户，请添加：</p>',
                '<div class="onepass-inputs">',
                    '<div class="onepass-input">',
                        '名称' + '<input id="onepass-name" />',
                    '</div>'
        ];

        for( var i = 0; i < type.inputs.length; i++ ){
            var input = type.inputs[ i ];
            var inputStr = [
                '<div class="onepass-input">',
                    input.name + '<input type="' + input.type + '" id="onepass-' + input.opType + '" />',
                '</div>'
            ];
            accountStr.push( inputStr.join( '\n' ) );
        }

        accountStr.push( '</div>' );
        accountStr.push( '<a id="onepass-submit">保存</a>' );
        accountStr.push( '</div>' );

        $( 'body' ).append( accountStr.join( '\n' ) );

        var account = {};

        for( var i = 0; i < type.inputs.length; i++ ){
            var input = type.inputs[ i ];
            $( '#onepass-' + input.opType ).on( 'change', function( input ){
                return function( ){
                    account[ input.opType ] = this.value;
                    $( input.selector ).val( this.value );
                }
            }( input ) );
        }

        $( '#onepass-submit' ).on( 'click', function( ){
            account.passtype = type.id;
            account.passname = $( '#onepass-name' ).val( );
            chrome.runtime.sendMessage( { addAccount: account }, function( ){
                $( type.submit ).trigger( 'click' );
            } );
        } );


    }

    function selectOne( callback ){

        var inputs = $( 'input:not([type="hidden"])' ).map( function( ){
            if( $( this ).is( ':visible' ) ){
                return this;
            }
        } );

        inputs.each( function( i ){
            var input = $( [
                '<div class="onepass-addinput" id="onepass-addinput-' + i + '"></div>'
            ].join( '\n' ) );

            var p = $( this ).position( );
            $( this ).parent( ).append( input );

            input.css( {
                left: p.left,
                top: p.top,
                width: $( this ).outerWidth( ),
                height: $( this ).outerHeight( )
            } );

        } );

        $( 'body' ).one( 'click', function( event ){
            event.preventDefault( );
            var arr = event.target.id.split( '-' );
            if( arr.length === 3 && arr[ 0 ] + arr[ 1 ] === 'onepassaddinput' ){
                callback( inputs[ +arr[ 2 ] ] );
            }else{
                callback( event.target );
            }
            $( '.onepass-addinput' ).remove( );

        } );

    }

    function addType( ){

        var typeStr = [
            '<div id="onepass-addtype">',
                '<h3>添加网站类型</h3>',
                '<div id="onepass-addtype-view">',
                    '<ul id="onepass-addtype-content">',
                        '<li>',
                            '<div class="onepass-addtype-name">账户</div>',
                            '<div>选择</div>',
                        '</li>',
                        '<li>',
                            '<div class="onepass-addtype-name">密码</div>',
                            '<div>选择</div>',
                        '</li>',
                    '</ul>',
                '</div>',
            '</div>'
        ];

        if( window.parent ){
            $( window.parent.document.body ).append( typeStr.join( '\n' ) );
        }else{
            $( 'body' ).append( typeStr.join( '\n' ) );
        }

    }

    function authorize( callback ){

        var authorizeStr = [
            '<div id="onepass-authorize">',
                '<h3>请输入 OnePass 独立密码</h3>',
                '<input id="onepass-onepass" type="password">',
                '<a id="onepass-onepass-submit">确定</a>',
            '</div>'
        ].join( '\n' );

        $( 'body' ).append( authorizeStr );
        $( '#onepass-onepass' ).focus( ).keydown( function( e ){
            if( e.keyCode == 13 ){
                $( '#onepass-onepass-submit' ).trigger( 'click' );
            }
        } );

        $( '#onepass-onepass-submit' ).on( 'click', function( ){

            var password = $( '#onepass-onepass' ).val( );
            chrome.runtime.sendMessage( { checkOnePass: password }, function( res ) {

                if( res ){

                    callback( );
                    $( '#onepass-authorize' ).hide( function( ){
                        $( this ).remove( );
                    } );

                }

            } );

        } );

    }

    function login( account, type ){

        // var formSelector = type.form || '';
        
        _.each( type.inputs, function( x ){
            if( x.opType === 'password' ){
                chrome.runtime.sendMessage( { decrypt: account.password }, function( res ) {

                    $( x.selector ).val( res );
                    // TODO: 需要更严谨的判断
                    $( type.submit ).trigger( 'click' );

                } );
            }else{
                $( x.selector ).val( account[ x.opType ] );
            }
        } );

    }

    chrome.runtime.onMessage.addListener( function( req, sender, sendResponse ) {
        if ( req.authorize === 'OnePass' ){
            authorize( function( ){
                sendResponse( {authorized: true} );
            } );
        }
        return true;
    } );

    $( document ).on( 'keydown', function ( event ) {

        if( event.ctrlKey && event.keyCode == 191 ){

            chrome.runtime.sendMessage( { url: window.location.href }, function( res ) {

                var type = res.type,
                    accounts = res.accounts;

                if( type && accounts.length ){

                    // TODO: 多账户判断
                    account = accounts[ 0 ];
                    if( type.type === 0 ){
                        login( account, type );
                    }

                }else if( type ){

                    addAccount( type );

                }else{

                    addType( );

                }

            } );

        }

    } );

} )
