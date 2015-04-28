/// <reference path="typings/tsd.d.ts" />

Number.prototype['mod'] = function(n) {
  return ((this % n) + n) % n;
};

interface ISlideshowScope extends ng.IScope {
  totalTimePromise;
  totalTime: number;
  slideTime: number;
  showSlideTimer: boolean;
  showDebug: boolean;
}

interface ISlideshowSlideScope extends ng.IScope {
  visible: boolean;
  next: () => boolean;
  prev: () => boolean;
  shown: () => void;
}

interface ISlideshowSlideVideoScope extends ISlideshowSlideScope {
  _videoPlayed: boolean;
  autoplay: string;
}

class SlideController {
  constructor(private $timeout: ng.ITimeoutService) { }
}

class SlideshowController {
  private slides = [];
  private asides = [];
  private slideIndex:number;
  private shouldLoop:boolean = false;
  private slideshow: ISlideshowScope;
  private slidesLoadedPromise = null;

  constructor(private $timeout:ng.ITimeoutService, private $location: ng.ILocationService){
    var locationSplit = $location.path().split("/");
    this.slideIndex = parseInt(locationSplit[locationSplit.length - 1]) || 0;
  }

  private hideSlide(index: number) {
    this.$timeout(() => { this.slides[index].visible = false; });
  }
  private showSlide(index: number){
    this.$timeout(() => {
      this.slides[index].visible = true;
      this.$location.path("" + index);
      if( angular.isFunction(this.slides[index].shown)) this.slides[index].shown({$index:index});
    });
  }
  next(){
    var nextIndex = this.slideIndex;

    if (this.slides.length > 0 && this.shouldLoop) { nextIndex = (((this.slideIndex + 1) % this.slides.length) + this.slides.length) % this.slides.length; }
    else if (this.slides.length > 0 && this.slideIndex + 1 < this.slides.length) { nextIndex += 1; }
    
    var nextMethod = this.slides[this.slideIndex].next;
    if (this.slideIndex != nextIndex && (!angular.isFunction(nextMethod) || nextMethod({ $index: this.slideIndex, $nextIndex:nextIndex }))) {
      this.hideSlide(this.slideIndex);
      this.showSlide(nextIndex);
      this.slideIndex = nextIndex;

      this.resetSlideTimer();
    }
  }
  prev(){
    var prevIndex = this.slideIndex;

    if (this.slides.length > 0 && this.shouldLoop) { prevIndex = (((this.slideIndex - 1) % this.slides.length) + this.slides.length) % this.slides.length; }
    else if (this.slides.length > 0 && this.slideIndex - 1 >= 0) { prevIndex -= 1; }

    var prevMethod = this.slides[this.slideIndex].prev;
    if (this.slideIndex != prevIndex && (!angular.isFunction(prevMethod) || prevMethod({ $index: this.slideIndex, $prevIndex: prevIndex }))) {
      this.hideSlide(this.slideIndex);
      this.showSlide(prevIndex);
      this.slideIndex = prevIndex;
      this.resetSlideTimer();
    }
  }
  addSlide($scope: ISlideshowSlideScope) {
    if (this.slides.length == this.slideIndex) {
      $scope.visible = true;
      this.showSlide(this.slideIndex);
    } else {
      $scope.visible = false;
    }
    this.slides.push($scope);

    this.$timeout.cancel(this.slidesLoadedPromise);
    this.slidesLoadedPromise = this.$timeout( () => {
      if (this.slideIndex >= this.slides.length) {
        var index = this.slides.length - 1;
        this.showSlide(index);
        this.slideIndex = index;
      }
    });
  }

  addSlideshow($scope: ISlideshowScope) {
    this.slideshow = $scope;
    this.slideshow.showDebug = false;
    this.slideshow.totalTime = 0;
    this.slideshow.slideTime = 0;
  }

  toggleDebug() {
    this.$timeout(() => {
      this.slideshow.showDebug
      this.togglePresentationTimer(this.slideshow.showDebug);
      this.slideshow.showDebug = !this.slideshow.showDebug;
    });
  }

  private togglePresentationTimer(shouldStop: boolean) {

    var iterateTime = () => {
      this.slideshow.totalTime += 1;
      this.slideshow.slideTime += 1;
      this.slideshow.totalTimePromise = this.$timeout(iterateTime, 1000);
    }

    if (shouldStop) {
      this.$timeout.cancel(this.slideshow.totalTimePromise);
      this.slideshow.totalTime = 0;
      this.slideshow.slideTime = 0;
    }
    else {
      this.slideshow.totalTimePromise = this.$timeout(iterateTime, 1000);
    }
  }

  private resetSlideTimer() {
    this.slideshow.slideTime = 0;
    this.slideshow.showSlideTimer = true;
  }
}

function Slideshow($window: ng.IWindowService): ng.IDirective {
  var directive: ng.IDirective = <ng.IDirective>{};
  directive.restrict = "AE";
  directive.scope = {};
  directive.transclude = true;
  directive.template = "<div class='slideshow-prep' ng-class='{showDebug:showDebug}'>" +
                         "<div class='slideshow-prep-timer'>{{totalTime | slideTime}}</div>" +
                         "<div class='slideshow-prep-timer-small' ng-show='showSlideTimer'>{{slideTime | slideTime}}</div>" +
                       "</div>" +
                       "<div class='slideshow-content' ng-transclude ng-class='{showDebug:showDebug}'></div>";
  directive.controller = SlideshowController;
  directive.link = function($scope: ISlideshowScope, element: ng.IRootElementService, attrs, slideController: SlideshowController) {
    slideController.addSlideshow($scope);

    angular.element($window).on('keydown', (e:JQueryKeyEventObject) => {
      if(e.keyCode == 37 || (e.keyCode == 32 && e.shiftKey) || (e.keyCode == 33)) {
        slideController.prev();
      } else if (e.keyCode == 39 || e.keyCode == 32 || e.keyCode == 34) {
        slideController.next();
      } else if ( (e.keyCode == 191 && e.shiftKey) || e.keyCode == 190) {
        slideController.toggleDebug();
      }
    });
    
    element.addClass("slideshow");
  }
  return directive;
}

function SlideshowSlide(): ng.IDirective {
  var directive: ng.IDirective = <ng.IDirective>{};
  directive.restrict = "AE";
  directive.scope = { customClasses: "@class", shown: "&shown", next: "&next", prev: "&prev" };
  directive.transclude = true;
  directive.replace = true;
  directive.require = "^slideshow"
  directive.template = "<div class='slideshow-slide' ng-show='visible' class='{{customClasses}}'><div class='slide-content' ng-transclude></div></div>"
  directive.controller = SlideController;
  directive.link = function($scope: ISlideshowSlideScope, element: ng.IRootElementService, attrs, slideshowController: SlideshowController) {
    slideshowController.addSlide($scope);

    if (!angular.isDefined(attrs.shown)){ $scope.shown = null; }
    if (!angular.isDefined(attrs.next)) { $scope.next = null; }
    if (!angular.isDefined(attrs.prev)) { $scope.prev = null; }
  }
  return directive;
}

function SlideshowSlideVideo(): ng.IDirective {
  var directive: ng.IDirective = <ng.IDirective>{};
  directive.restrict = "AE";
  directive.scope = { src: '=', customClasses: "@class", autoplay: '@', shown: "&shown", next: "&next", prev: "&prev" };
  directive.transclude = true;
  directive.replace = true;
  directive.require = "^slideshow"
  directive.template = "<div class='slideshow-slide' ng-show='visible' class='{{customClasses}}'>" +
                         "<video class='background'><source ng-src='{{src}}'/></video>" +
                         "<div class='slide-content' ng-transclude></div>"
                       "</div>"
  directive.controller = SlideController;
  directive.link = function($scope: ISlideshowSlideVideoScope, element: ng.IRootElementService, attrs, slideshowController: SlideshowController) {
    $scope._videoPlayed = false;

    var playVideo = () => {
      var video:any = element.find("video")[0];
      video.play();
      
      video.onended = () => {
        $scope._videoPlayed = true;
      }
    }

    slideshowController.addSlide($scope);

    if (!angular.isDefined(attrs.shown)) { $scope.shown = null; }
    if (!angular.isDefined(attrs.next)) { $scope.next = null; }
    if (!angular.isDefined(attrs.prev)) { $scope.prev = null; }

    if($scope.next == null) {
      $scope.next = () => {
        if ($scope.autoplay == "true") return true;

        var returnValue = $scope._videoPlayed;

        if ($scope._videoPlayed == false) { playVideo(); }
        $scope._videoPlayed = true;

        return returnValue;
      }
    }

    if($scope.shown == null) {
      $scope.shown = () => {
        if ($scope.autoplay == "true") {
          var video: any = element.find("video")[0];
          video.play();
        }
      }
    }

    $scope.$watch("visible", (nv) => {
      if(nv == false) {
        $scope._videoPlayed = false;
        var video:any = element.find("video")[0];
        video.pause();
        video.currentTime = 0;
      }
    });

  }
  return directive;
}

function SlideshowTimeFilter() {
  return (totalSeconds) => {
    var _seconds: string = Math.floor(totalSeconds % 60).toString();
    var _minutes: string = Math.floor((totalSeconds % (60 * 60)) / (60)).toString();
    var _hours: string = Math.floor((totalSeconds % (60 * 60 * 60)) / (60 * 60)).toString();

    var leading0Seconds = _seconds.length == 2 ? _seconds : "0" + _seconds;
    var leading0Minutes = _minutes.length == 2 ? _minutes : "0" + _minutes;
    var leading0Hours = _hours.length == 2 ? _hours : "0" + _hours;
    
    var seconds = _seconds;
    var minutes = _minutes;
    var hours = _hours;

    if(parseInt(_hours) > 0){
      minutes = leading0Minutes;
      seconds = leading0Seconds;
    } else if(parseInt(_minutes) > 0) {
      seconds = leading0Seconds;
    }

    var output = "";
    if (parseInt(hours) > 0) { output += hours + ":" }
    if (parseInt(minutes) > 0) { output += minutes + ":" }
    output += seconds;

    return output;
  }
}

angular.module('slideshow', [])
  .directive("slideshow", Slideshow)
  .directive("slide", SlideshowSlide)
  .directive("slideVideo", SlideshowSlideVideo)
  .filter("slideTime", SlideshowTimeFilter);
