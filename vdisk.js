function Vdisk( options ){

    this.token = options.token;

    this.root = options.root || 'sandbox';

}

Vdisk.prototype = {

    constructor: Vdisk,

    API_URL : 'https://api.weipan.cn/2',
    WEIBO_URL : 'https://api.weipan.cn/weibo',
    CONTENT_SAFE_URL : 'https://upload-vdisk.sina.com.cn/2',

    ajax: function( options, backXHR ){

        var token = this.token,
            __this__ = this;

        return $.ajax( _.extend( {
            dataType: 'JSON',
            beforeSend: function( xhr ){
                xhr.setRequestHeader( 'Authorization', 'OAuth2 ' + token );
                backXHR && backXHR( xhr );
            }
        }, options ) ).fail( function( data ){
            if( data.responseJSON ){
                switch( data.responseJSON.error_detail_code ){
                    case '40102':
                        __this__.trigger( 'clearToken' );
                        break;
                }
            }else{

            }
        } );

    },

    metadata: function( path, callback ){

        if( typeof path === 'function' ){
            callback = path;
            path = '/';
        }

        this.ajax( {
            url: this.API_URL + '/metadata/' + this.root + path
        } ).done( callback );

    },

    upload: function( path, file, callback ){

        var formData = new FormData( );
        // TODO: overwrite 可选
        formData.append( 'overwrite', true );
        formData.append( 'file', file, file.name );

        this.ajax( {
            url: this.CONTENT_SAFE_URL + '/files/sandbox' + path,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false
        } ).done( callback );

    },

    file: function( path, callback ){

        var request = new XMLHttpRequest( );
        request.open( 'GET', this.API_URL + '/files/' + this.root + path + '?access_token=' + this.token, true );

        request.addEventListener( 'load', function ( event ) {

            callback( this.response );

        }, false );

        request.send( null );

    },

    createFolder: function( path, callback ){

        this.ajax( {
            url: this.API_URL + '/fileops/create_folder',
            type: 'POST',
            data: {
                root: this.root,
                path: path
            }
        } ).done( callback )

    },

    delete: function( path, callback ){

        this.ajax( {
            url: this.API_URL + '/fileops/delete',
            type: 'POST',
            data: {
                root: this.root,
                path: path
            }
        } ).done( callback );

    }

};

Events.mixTo( Vdisk );