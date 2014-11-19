var util = util || {};

//
// Useful variables & functions for this sample!
//
util.logs = false; // Set to true for extra info!
util.images = {};
util.imagesToLoad = 0;
util.loadedImages = 0;
util.errorImages = 0;

util.isLoaded = function() {
    var loaded = (util.imagesToLoad == util.loadedImages + util.errorImages);
    util.log(util.loadedImages + " of " + util.imagesToLoad + " images loaded (" + util.errorImages + " errors)." + (loaded ? ".. Yeah!" : ""));
    return loaded;
};

util.onImageLoad = function() {
	util.loadedImages++;
};

util.onImageError = function() {
	util.errorImages++;
};

util.log = function(msg) {
	if (util.logs) {
		console.log(msg);
	}
};

//
// ResponsiveCanvas
//

(function() {

var ResponsiveCanvas = function(id, parentId, baseWidth, baseHeight, scaleFactors, imageFolders, options) {
    
    this.id = id;
    this.parentId = parentId;
	this.parent = document.getElementById(this.parentId);
    this.baseWidth = baseWidth; // Preferred width (working area).
    this.baseHeight = baseHeight; // Preferred height (working area).
	this.scaleFactors = scaleFactors;
	this.imageFolders = imageFolders;
    
    var options = options || {};
    this.safeWidth = options.safeWidth || null;
    this.safeHeight = options.safeHeight || null;
    this.viewMode = options.viewMode || "FIT";
    this.allowHiDPI = options.allowHiDPI || true;
    this.forcePixelRatio = options.forcePixelRatio;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("id", this.id);
    this.parent.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
	
	this.drawCallback = null;
	
	var that = this;
	this.context.drawResponsiveImage = function(name, x, y) {
		// Solution 1
		/* TODO: PERFORMANCE-ISSUE - Don’t scale images in drawImage!!!
		Ver: https://hacks.mozilla.org/2013/05/optimizing-your-javascript-game-for-firefox-os/
		Cache various sizes of your images on an offscreen canvas when loading as opposed to constantly scaling them in drawImage.
		jsPerf – Canvas drawImage Scaling Performance. */
		var img = that.getImageSet(name).getImage(that.imageIndex);
		that.context.drawImage(img, 0, 0,
							   img.naturalWidth,
							   img.naturalHeight,
							   x, y,
							   img.naturalWidth / that.imageFactor,   // Siempre da números enteros.
							   img.naturalHeight / that.imageFactor); // Siempre da números enteros.
		// Solution 2
		// ...
	};	
    
    this.scale();

};

var p = ResponsiveCanvas.prototype;

p.preload = function(images) {
	for (var i = 0; i < images.length; i++) {
		var name = images[i];
		util.log("Loading image set for " + name + ".");
		util.imagesToLoad = util.imagesToLoad + this.scaleFactors.length;
		var imgSet = new util.ImageSet(name, this.imageFolders);
		util.images[name] = imgSet;
	}
};

p.getImageSet = function(name) {
	var imgSet = util.images[name];
	return imgSet;
};

p.setDrawCallback = function(callback) {
	this.drawCallback = callback;
};

p.scale = function() {

	util.log("------------ Scaling canvas! ------------");
	
    this.parentWidth = this.parent.offsetWidth;
    this.parentHeight = this.parent.offsetHeight;
	util.log("this.parent\n\t.width = " + this.parentWidth + "\n\t.height = " + this.parentHeight);
    
    // Find scaleFactor based on this.options.viewMode.
    var scaleFactorByWidth = this.parentWidth / this.baseWidth;
    var scaleFactorByHeight = this.parentHeight / this.baseHeight;
    if (this.viewMode === "COVER") {
       var coverScaleFactor = Math.max(scaleFactorByWidth, scaleFactorByHeight);
       if (!this.safeWidth && !this.safeHeight) {
           this.scaleFactor = coverScaleFactor;
       } else {
           var scaleFactorBySafeWidth = 9007199254740992; // Max integer.
           var scaleFactorBySafeHeight = 9007199254740992; // Max integer.
           if (this.safeWidth) {
                scaleFactorBySafeWidth = this.parentWidth / this.safeWidth;
           }
           if (this.safeHeight) {
                scaleFactorBySafeHeight = this.parentHeight / this.safeHeight;
           }
           var safeScaleFactor = Math.min(scaleFactorBySafeWidth, scaleFactorBySafeHeight);
           this.scaleFactor = Math.min(coverScaleFactor, safeScaleFactor); 
       }
    } else { // FIT!
        this.scaleFactor = Math.min(scaleFactorByWidth, scaleFactorByHeight);
    }
	util.log("this.scaleFactor = " + this.scaleFactor); 
    
    this.RW = this.baseWidth * this.scaleFactor |0; // Esta multiplicación NUNCA (ni con this.scaleFactor == 1.5) da decimales.
    this.RH = this.baseHeight * this.scaleFactor |0; // Esta multiplicación NUNCA (ni con this.scaleFactor == 1.5) da decimales.
	util.log("this.layout\n\t.width = " + this.RW + "\n\t.height = " + this.RH);
    
    this.VX = ((this.parentWidth - this.RW) / 2) |0; // Si CW es par y RW es par, la división siempre es un numero entero.   
    this.VY = ((this.parentHeight - this.RH) / 2) |0; // Si CW es par y RW es par, la división siempre es un numero entero.
	util.log("this.translate\n\t.x = " + this.VX + "\n\t.y = " + this.VY);

    if (this.forcePixelRatio) {
        this.pixelRatio = this.forcePixelRatio;
    } else {
        this.pixelRatio = (this.allowHiDPI ? window.devicePixelRatio || 1 : 1);
    }
	util.log("this.pixelRatio = " + this.pixelRatio +" (allowHiDPI = " + this.allowHiDPI + ")");
    
    this.scaleFactorByPixelRatio = this.scaleFactor * this.pixelRatio;
    
    this.imageIndex = 0;
    for (var i = 0; i < this.scaleFactors.length - 1; i++) {
        if (this.scaleFactorByPixelRatio > this.scaleFactors[i]) {
            this.imageIndex++;
        } else {
            break;
        }
    }
	util.log("this.imageIndex = " + this.imageIndex);
    this.imageFactor = this.scaleFactors[this.imageIndex];
	util.log("Image factor = " +  this.imageFactor + " / folder = " + this.imageFolders[this.imageIndex]);    
    
    this.canvas.width = this.parentWidth * this.pixelRatio;
    this.canvas.height = this.parentHeight * this.pixelRatio;
	util.log("this.canvas\n\t.width = " + this.canvas.width + " (= this.parentWidth)\n\t.height = " + this.canvas.height + " (= this.parentHeight)");
    
    this.canvas.style.width = this.parentWidth + "px";
    this.canvas.style.height = this.parentHeight + "px";
    
    this.context.translate(this.VX * this.pixelRatio, this.VY * this.pixelRatio);
    this.context.scale(this.scaleFactorByPixelRatio, this.scaleFactorByPixelRatio);

};

p.onready = function() {
	var that = this;
	var loading = window.setInterval(function() {
										if (util.isLoaded()) {
											if (that.drawCallback) {
												that.drawCallback(that.context);
											} else {
												util.log("ERROR: drawCallback is undefined.");
											}
											window.clearInterval(loading);
										} else {
											util.log("Loading images...");
										}
									}, 500);
};
    
p.onresize = function() {
    this.scale();
    this.drawCallback(this.context);
};

util.ResponsiveCanvas = ResponsiveCanvas;

}());

//
// ImageSet
//

(function() {

var ImageSet = function(src, imageFolders) {
    this.imgArray = [];
    var loaded = 0;
    for (var i = 0; i < imageFolders.length; i++) {
        this.imgArray[i] = new Image();
        var that = this.imgArray[i];
        this.imgArray[i].onload = util.onImageLoad;
		this.imgArray[i].onerror = util.onImageError;		
        this.imgArray[i].src = imageFolders[i] + "/" + src; 
    }
};
    
var p = ImageSet.prototype;

p.getImage = function(imageIndex) {
    return  this.imgArray[imageIndex];
};

util.ImageSet = ImageSet;

}());