// postMessage = function( a,b,c,d,e ){
//     console.log( a,b,c,d,e );
// };

$( function( ){

    var bg = chrome.extension.getBackgroundPage( ),
        onePass = bg.onePass,
        OnePass = bg.OnePass;

    $('.btn').button( );

    // 检测是否需要初始化
    OnePass.get( [ 'OnePass' ], function( items ){

        if( !items.OnePass ){

            $( '#initOnePass' ).modal( );

        }

    } );
    // 初始化云认证
    $( '#vdisk' ).on( 'click', function( ){

        onePass.authorizeWeibo( function( ){
            $( '#cloudStatus' ).text( '认证成功！等待同步数据…' );
            onePass.initVdisk( function( ){
                $( '#cloudStatus' ).text( '数据同步成功！' );
            } );
        }, function( ){
            $( '#cloudStatus' ).text( '认证失败!' );
        } );

    } );
    $( '#initSubmit' ).on( 'click', function( ){

        onePass.initPassword( $( '#OnePass' ).val( ) );

    } );
    
    // 临时测试
    $( '#initOnePass' ).modal( );
    

} )
