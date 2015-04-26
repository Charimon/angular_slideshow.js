/// <reference path="typings/tsd.d.ts" />
Number.prototype['mod'] = function (n) {
    return ((this % n) + n) % n;
};
var SlideController = (function () {
    function SlideController($timeout) {
        this.$timeout = $timeout;
    }
    return SlideController;
})();
var SlideshowController = (function () {
    function SlideshowController($timeout, $location) {
        this.$timeout = $timeout;
        this.$location = $location;
        this.slides = [];
        this.asides = [];
        this.shouldLoop = false;
        this.slidesLoadedPromise = null;
        var locationSplit = $location.path().split("/");
        this.slideIndex = parseInt(locationSplit[locationSplit.length - 1]) || 0;
    }
    SlideshowController.prototype.hideSlide = function (index) {
        var _this = this;
        this.$timeout(function () { _this.slides[index].visible = false; });
    };
    SlideshowController.prototype.showSlide = function (index) {
        var _this = this;
        this.$timeout(function () {
            _this.slides[index].visible = true;
            _this.$location.path("" + index);
        });
    };
    SlideshowController.prototype.next = function () {
        var nextIndex = this.slideIndex;
        if (this.slides.length > 0 && this.shouldLoop) {
            nextIndex = (((this.slideIndex + 1) % this.slides.length) + this.slides.length) % this.slides.length;
        }
        else if (this.slides.length > 0 && this.slideIndex + 1 < this.slides.length) {
            nextIndex += 1;
        }
        var nextMethod = this.slides[this.slideIndex]._next;
        if (this.slideIndex != nextIndex && (!angular.isFunction(nextMethod) || nextMethod())) {
            this.hideSlide(this.slideIndex);
            this.showSlide(nextIndex);
            this.slideIndex = nextIndex;
            this.resetSlideTimer();
        }
    };
    SlideshowController.prototype.prev = function () {
        var prevIndex = this.slideIndex;
        if (this.slides.length > 0 && this.shouldLoop) {
            prevIndex = (((this.slideIndex - 1) % this.slides.length) + this.slides.length) % this.slides.length;
        }
        else if (this.slides.length > 0 && this.slideIndex - 1 >= 0) {
            prevIndex -= 1;
        }
        var prevMethod = this.slides[this.slideIndex]._prev;
        if (this.slideIndex != prevIndex && (!angular.isFunction(prevMethod) || prevMethod())) {
            this.hideSlide(this.slideIndex);
            this.showSlide(prevIndex);
            this.slideIndex = prevIndex;
            this.resetSlideTimer();
        }
    };
    SlideshowController.prototype.addSlide = function ($scope) {
        var _this = this;
        if (this.slides.length == this.slideIndex) {
            $scope.visible = true;
        }
        else {
            $scope.visible = false;
        }
        this.slides.push($scope);
        this.$timeout.cancel(this.slidesLoadedPromise);
        this.slidesLoadedPromise = this.$timeout(function () {
            if (_this.slideIndex >= _this.slides.length) {
                var index = _this.slides.length - 1;
                _this.$location.path("" + index);
                _this.slides[index].visible = true;
                _this.slideIndex = index;
            }
        });
    };
    SlideshowController.prototype.addSlideshow = function ($scope) {
        this.slideshow = $scope;
        this.slideshow.showDebug = false;
        this.slideshow.totalTime = 0;
        this.slideshow.slideTime = 0;
    };
    SlideshowController.prototype.toggleDebug = function () {
        var _this = this;
        this.$timeout(function () {
            _this.slideshow.showDebug;
            _this.togglePresentationTimer(_this.slideshow.showDebug);
            _this.slideshow.showDebug = !_this.slideshow.showDebug;
        });
    };
    SlideshowController.prototype.togglePresentationTimer = function (shouldStop) {
        var _this = this;
        var iterateTime = function () {
            _this.slideshow.totalTime += 1;
            _this.slideshow.slideTime += 1;
            _this.slideshow.totalTimePromise = _this.$timeout(iterateTime, 1000);
        };
        if (shouldStop) {
            this.$timeout.cancel(this.slideshow.totalTimePromise);
            this.slideshow.totalTime = 0;
            this.slideshow.slideTime = 0;
        }
        else {
            this.slideshow.totalTimePromise = this.$timeout(iterateTime, 1000);
        }
    };
    SlideshowController.prototype.resetSlideTimer = function () {
        this.slideshow.slideTime = 0;
        this.slideshow.showSlideTimer = true;
    };
    return SlideshowController;
})();
function Slideshow($window) {
    var directive = {};
    directive.restrict = "AE";
    directive.scope = {};
    directive.transclude = true;
    directive.template = "<div class='slideshow-prep' ng-class='{showDebug:showDebug}'>" +
        "<div class='slideshow-prep-timer'>{{totalTime | slideTime}}</div>" +
        "<div class='slideshow-prep-timer-small' ng-show='showSlideTimer'>{{slideTime | slideTime}}</div>" +
        "</div>" +
        "<div class='slideshow-content' ng-transclude ng-class='{showDebug:showDebug}'></div>";
    directive.controller = SlideshowController;
    directive.link = function ($scope, element, attrs, slideController) {
        slideController.addSlideshow($scope);
        angular.element($window).on('keydown', function (e) {
            if (e.keyCode == 37 || (e.keyCode == 32 && e.shiftKey) || (e.keyCode == 33)) {
                slideController.prev();
            }
            else if (e.keyCode == 39 || e.keyCode == 32 || e.keyCode == 34) {
                slideController.next();
            }
            else if (e.keyCode == 191 && e.shiftKey) {
                slideController.toggleDebug();
            }
        });
        element.addClass("slideshow");
    };
    return directive;
}
function SlideshowSlide() {
    var directive = {};
    directive.restrict = "AE";
    directive.scope = { customClasses: "@class" };
    directive.transclude = true;
    directive.replace = true;
    directive.require = "^slideshow";
    directive.template = "<div class='slideshow-slide' ng-show='visible' class='{{customClasses}}'><div class='slide-content' ng-transclude></div></div>";
    directive.controller = SlideController;
    directive.link = function ($scope, element, attrs, slideshowController) {
        slideshowController.addSlide($scope);
    };
    return directive;
}
function SlideshowSlideVideo() {
    var directive = {};
    directive.restrict = "AE";
    directive.scope = { src: '=', customClasses: "@class" };
    directive.transclude = true;
    directive.replace = true;
    directive.require = "^slideshow";
    directive.template = "<div class='slideshow-slide' ng-show='visible' class='{{customClasses}}'>" +
        "<video class='background'><source ng-src='{{src}}'/></video>" +
        "<div class='slide-content' ng-transclude></div>";
    "</div>";
    directive.controller = SlideController;
    directive.link = function ($scope, element, attrs, slideshowController) {
        $scope._videoPlayed = false;
        var playVideo = function () {
            var video = element.find("video")[0];
            video.play();
            video.onended = function () {
                $scope._videoPlayed = true;
            };
        };
        slideshowController.addSlide($scope);
        $scope._next = function () {
            var returnValue = $scope._videoPlayed;
            if ($scope._videoPlayed == false) {
                playVideo();
            }
            $scope._videoPlayed = true;
            return returnValue;
        };
        $scope.$watch("visible", function (nv) {
            if (nv == false) {
                $scope._videoPlayed = false;
                var video = element.find("video")[0];
                video.pause();
                video.currentTime = 0;
            }
        });
    };
    return directive;
}
function SlideshowTimeFilter() {
    return function (totalSeconds) {
        var _seconds = Math.floor(totalSeconds % 60).toString();
        var _minutes = Math.floor((totalSeconds % (60 * 60)) / (60)).toString();
        var _hours = Math.floor((totalSeconds % (60 * 60 * 60)) / (60 * 60)).toString();
        var leading0Seconds = _seconds.length == 2 ? _seconds : "0" + _seconds;
        var leading0Minutes = _minutes.length == 2 ? _minutes : "0" + _minutes;
        var leading0Hours = _hours.length == 2 ? _hours : "0" + _hours;
        var seconds = _seconds;
        var minutes = _minutes;
        var hours = _hours;
        if (parseInt(_hours) > 0) {
            minutes = leading0Minutes;
            seconds = leading0Seconds;
        }
        else if (parseInt(_minutes) > 0) {
            seconds = leading0Seconds;
        }
        var output = "";
        if (parseInt(hours) > 0) {
            output += hours + ":";
        }
        if (parseInt(minutes) > 0) {
            output += minutes + ":";
        }
        output += seconds;
        return output;
    };
}
angular.module('slideshow', [])
    .directive("slideshow", Slideshow)
    .directive("slide", SlideshowSlide)
    .directive("slideVideo", SlideshowSlideVideo)
    .filter("slideTime", SlideshowTimeFilter);
