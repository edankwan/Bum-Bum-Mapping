var bumpMapping = (function(){

    var WIDTH = 480;
    var HEIGHT = 320;
    var MOUSEZ = 60;
    var MOUSEZ2 = MOUSEZ*MOUSEZ;
    var RADIUS = 300;
    var HELL_YEAH = true;
    var NAH = false;

    var _wrapper;
    var _canvas;
    var _preloader;
    var _info;
    var _infoWidth;
    var _infoHeight;

    var _normal;
    var _duffuse;
    var _cache;
    var _cacheData;

    var _diffuseUrl;
    var _normalUrl;

    var _transformStyleName;

    var _px = WIDTH >> 1;
    var _py = HEIGHT >> 1;
    var _ptx = _px;
    var _pty = _py;

    var _isCanvasReady = NAH; // awesome to use this instead of using false.

    function init(){
        _initVariables();
        _initPreloaderEvents();
    }

    function _initVariables(){
        _wrapper =document.getElementById("wrapper");
        _canvas =document.getElementById("canvas");
        _preloader =document.getElementById("preloader");
        _info =document.getElementById("info");
        _infoWidth = _info.clientWidth;
        _infoHeight = _info.clientHeight;

        _diffuseUrl = _canvas.getAttribute("data-diffuse");
        _normalUrl = _canvas.getAttribute("data-normal");

        _ctx = _canvas.getContext("2d");


        var testStyle = document.body.style;
        var stylePrefix =
            "webkitTransform" in testStyle ? "webkit" :
            "MozTransform" in testStyle ? "Moz" :
            "msTransform" in testStyle ? "ms" :
            "oTransform" in testStyle ? "o" :
            "";
        _transformStyleName = stylePrefix + (stylePrefix.length>0?"Transform":"transform");
    }

    function _initPreloaderEvents(){
        EKLoader.resetListeners(_updatePreloader);
        EKLoader.add(_diffuseUrl);
        EKLoader.add(_normalUrl);
        EKLoader.start();
    }

    function _updatePreloader(percentage){
        EKTweener.to(_preloader.style, 1, {width: percentage * 100, suffix: {width: "%"}, delay: .3, onComplete: percentage < 1 ? null : function(){
            _wrapper.setAttribute("class", "ready");
            _showInfo();
            _initCanvas();
            _initEvents();
        }});
    }

    function _showInfo(){
        var perspectiveTransform = new PerspectiveTransform(_info, _infoWidth, _infoHeight);
        EKTweenFunc.defaultFunc = EKTweenFunc.easeOutElastic;
        perspectiveTransform.topLeft.x = perspectiveTransform.bottomLeft.x = _infoWidth>>1;
        perspectiveTransform.topRight.x = perspectiveTransform.bottomRight.x = (_infoWidth>>1) + 1;
        perspectiveTransform.topLeft.y = perspectiveTransform.topRight.y = _infoHeight>>1;
        perspectiveTransform.bottomLeft.y = perspectiveTransform.bottomRight.y = (_infoHeight>>1) + 1;

        EKTweener.to(perspectiveTransform.topLeft, 2, {x: 0, y: 0, delay: .2});
        EKTweener.to(perspectiveTransform.topRight, 2, {x: _infoWidth, y: 0, delay: .3});
        EKTweener.to(perspectiveTransform.bottomLeft, 2, {x: 0, y: _infoHeight, delay: .4});
        EKTweener.to(perspectiveTransform.bottomRight, 2, {x: _infoWidth, y: _infoHeight, delay: .5});
        EKTweener.to({}, 2.5, {onUpdate: function(){perspectiveTransform.update();}});
        _info.style.left = 0;
    }


    //
    // REAL SHIT IS HERE
    //---------------------------
    function _initCanvas(){

        // Prepare the normal data
        //---------------------------
        var tmp = document.createElement("canvas");
        tmp2d = tmp.getContext("2d");
        tmp.width = WIDTH;
        tmp.height = HEIGHT;
        tmp2d.drawImage(EKLoader.get(_diffuseUrl).source, 0, 0);
        _duffuse = tmp2d.getImageData(0, 0, WIDTH, HEIGHT).data;
        tmp2d.drawImage(EKLoader.get(_normalUrl).source, 0, 0);
        var tmp = tmp2d.getImageData(0, 0, WIDTH, HEIGHT).data;
        _normal = [];
        for(var i = 0; i < WIDTH*HEIGHT*4; i+=4) {
            _normal.push(tmp[i]*2-255);
            _normal.push((255-tmp[i+1])*2-255);
            _normal.push(tmp[i+2]*2-255);
            _normal.push(0);
        }
        _ctx.fillStyle = "rgba(0,0,0)";
        _ctx.fillRect(0, 0, WIDTH, HEIGHT);
        _cache = _ctx.getImageData(0, 0, WIDTH, HEIGHT);
        _cacheData = _cache.data;

        _isCanvasReady = HELL_YEAH; // awesome to use this instead of using true.
    }
    function _initEvents() {
        if("ontouchstart" in window) {
            document.addEventListener("touchmove", function(e){_onInputMove(e.touches[0]);});
        } else {
            document.addEventListener("mousemove", _onInputMove);
        }
        setInterval(_render, 1000/60);
    }

    function _onInputMove(e) {
        _px = e.pageX - (window.innerWidth - WIDTH >> 1);
        _py = e.pageY - (window.innerHeight - HEIGHT >> 1);
    }

    function _clamp(val, min, max) {
        return val < min? min : (val > max? max : val);
    }

    function _render(){

        _ptx += ((_px < 0 ? 0 : _px > WIDTH ? WIDTH : _px) - _ptx) *.05;
        _pty += ((_py < 0 ? 0 : _py > HEIGHT ? HEIGHT : _py) - _pty) *.05;

        var x = WIDTH;
        var y;
        var p;
        var length;
        var intensity;
        var inv;
        var unitNormal;
        var normalFactor;
        var dx,dy,dz;
        var l = _ptx-RADIUS<0?0:_ptx-RADIUS;
        var r = _ptx+RADIUS>WIDTH?WIDTH:_ptx+RADIUS;
        var t = _pty-RADIUS<0?0:_pty-RADIUS;
        var b = _pty+RADIUS>HEIGHT?HEIGHT:_pty+RADIUS;
        while(x--){
            y = HEIGHT;
            while(y--){
                p = ((x|0) + (y|0) * WIDTH)*4;
                if(x<l||x>r||y<t||y>b){
                    _cacheData[p] = 0;
                    _cacheData[p+1] = 0;
                    _cacheData[p+2] = 0;
                }else{
                    dx = _ptx-x;
                    dy = _pty-y;
                    dz = MOUSEZ;
                    length = dx*dx+dy*dy;
                    inv = 1/Math.sqrt(length+MOUSEZ2);
                    dx*=inv;
                    dy*=inv;
                    dz*=inv;
                    intensity = _clamp((RADIUS-Math.sqrt(length))/40000,0,1);
                    normalFactor = _normal[p]*intensity*dx+_normal[p+1]*intensity*dy+_normal[p+2]*intensity*dz;
                    _cacheData[p] = _clamp(_duffuse[p] * normalFactor, 0, 255);
                    _cacheData[p+1] = _clamp(_duffuse[p+1] * normalFactor, 0, 255);
                    _cacheData[p+2] = _clamp(_duffuse[p+2] * normalFactor, 0, 255);
                }
            }

            _canvas.style[_transformStyleName] = "perspective(800px) rotateX(" + (( _ptx * 2 / WIDTH - 1 ) * 30) + "deg)  rotateY(" + ((_pty * 2 / HEIGHT - 1) * 30) + "deg)" ;
        }
        _ctx.putImageData(_cache, 0, 0);
    }

    return {
        init : init
    };

}());


bumpMapping.init();