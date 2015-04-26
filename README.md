# angular_slideshow.js
way to make slideshows in angular similar to revealjs

1. add dist/slideshow.js, dist/slideshow.css (or css/slideshow.sass if you like sass more)
2. add https://ajax.googleapis.com/ajax/libs/angularjs/x.y.z/angular-animate.js
3. add module dependency 'slideshow'
4. add directive
```html
<slideshow>
  <slide>Your slide goes here</slide>
</slideshow>
```
