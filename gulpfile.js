'use sctrict';

const
      //core
      gulp =              require('gulp'),
      fs =                require('fs'),
      //server
      browserSync =       require('browser-sync').create(),
      //gulp plugins
      brotli =            require('gulp-brotli'),
      cheerio =           require('gulp-cheerio'),
      csso =              require('gulp-csso'),
      fontmin =           require('gulp-fontmin'),
      gcmq =              require('gulp-group-css-media-queries'),
      newer =             require('gulp-newer'),
      nunjucks =          require('gulp-nunjucks'),
      postcss =           require('gulp-postcss'),
      rename =            require('gulp-rename'),
      replace =           require('gulp-replace'),
      rimraf =            require('gulp-rimraf'),
      sass =              require('gulp-sass'),
      bulkSass =          require('gulp-sass-bulk-import'),
      sourcemaps =        require('gulp-sourcemaps'),
      svgInline =         require('gulp-svg-inline'),
      svgSprite =         require('gulp-svg-sprite'),
      svgmin =            require('gulp-svgmin'),
      webp =              require('gulp-webp'),
      zopfli =            require('gulp-zopfli-fork'),
      //post css
      autoprefixer =      require('autoprefixer'),
      // colorblind = require('postcss-colorblind'),
      // webpack
      webpack =           require('webpack'),
      webpackGulp =       require('webpack-stream'),
      UglifyJSPlugin =    require('uglifyjs-webpack-plugin'),
      ProgressBarPlugin = require('progress-bar-webpack-plugin');

let err = event => console.error(`${event}`);

// базовые пути
const baseUrl = {
  dist: './dist',
  src:  './src'
};
const path = {
  dist: {
    html:   `${baseUrl.dist}/`,
    js:     `${baseUrl.dist}/js/`,
    css:    `${baseUrl.dist}/css/`,
    maps:   `${baseUrl.dist}/css/maps/`,
    img:    `${baseUrl.dist}/img/`,
    fonts:  `${baseUrl.dist}/fonts/`,
    locale: `${baseUrl.dist}/locale/`,
  },
  src: {
    html:      `${baseUrl.src}/*.html`,
    jsVendors: `${baseUrl.src}/js/vendors/`,
    js:        `${baseUrl.src}/js/app/`,
    css:       `${baseUrl.src}/css/`,
    img:       `${baseUrl.src}/img/`,
    svgSprite: `${baseUrl.src}/img/sprite/svg/`,
    fonts:     `${baseUrl.src}/fonts/`,
    locale:    `${baseUrl.src}/locale/`
  }
};
const files = {
  html:               `${baseUrl.src}/*.html`,
  template:           `${baseUrl.src}/template/**/*.{html,twig,hbs}`,
  data:               `${baseUrl.src}/*.json`,
  jsVendors:          `${baseUrl.src}/js/vendors/**/*.js`,
  js:                 `${baseUrl.src}/js/app/*.js`,
  css:                `${baseUrl.src}/css/**/*.scss`,
  img:                `${baseUrl.src}/img/**/*.*`,
  svgSprite:          `${baseUrl.src}/img/sprite/svg/**/*.svg`,
  svgSpriteColorize:  `${baseUrl.src}/img/sprite/svg/colorize/*.svg`,
  svgSpriteColorless: `${baseUrl.src}/img/sprite/svg/colorless/*.svg`,
  fonts:              `${baseUrl.src}/fonts/**/*.*`,
  locale:             `${baseUrl.src}/locale/*.js`
};

// Утилиты
gulp.task('clean', () => {
  new Promise((resolved, rejected) => {
    gulp
      .src(baseUrl.dist, {
        read: false
      })
      .on('error', () => console.log('Nothing to delete. Maybe'))
      .pipe(rimraf());
    resolved();
  });
});

gulp.task('watch:dev', () => {
  gulp.watch([
    files.img,
    files.fonts,
    files.locale,
  ], gulp.parallel('assets', 'svg:sprite', 'svg:injection'));

  gulp.watch([
    files.css
  ], gulp.parallel('style:dev'));

  gulp.watch([
    files.html,
    files.data
  ], gulp.parallel('templater'));
});

gulp.task('browser-sync', () => {
  browserSync.init({
    server: {
      baseDir: baseUrl.dist,
    },
    notify: false,
    reloadDebounce: 300,
  });
  browserSync.watch([
    `${baseUrl.dist}/**/*.*`
  ]).on('change', browserSync.reload);
});

// Сборки
gulp.task('svg:sprite', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(files.svgSprite)
      .pipe(svgmin({
        plugins: [{
          cleanupNumericValues: {
            floatPrecision: 2
          },
          removeDimensions: true,
          removeViewBox: false,
        }]
      }))
      .pipe(cheerio({
        run($) {
          // В случае ошибок раскоментировать
          // $('[fill]').removeAttr('fill');
          $('[stroke]').removeAttr('stroke');
          $('[style]').removeAttr('style');
        },
        parserOptions: {
          xmlMode: true
        }
      }))
      .pipe(replace('&gt;', '>'))
      .pipe(svgSprite({
        mode: {
          symbol: {
            render: {
              scss: {
                template: `${path.src.svgSprite}/svg.scss`,
                dest: `./../${path.src.css}/_libs/_sprite.scss`,
              }
            },
            sprite: `./../${path.dist.img}/sprite/svg/sprite.svg`,
          }
        }
      }))
      .pipe(gulp.dest('./'))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('style:dev', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.src.css}/main.scss`)
      .pipe(bulkSass())
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      // .pipe(gcmq())
      .pipe(postcss([autoprefixer('last 2 version', 'ie 10')]))
      .pipe(sourcemaps.write('./maps'))
      .pipe(gulp.dest(path.dist.css))
      .on('end', () => resolved())
      .on('error', () => rejected())
  })
});

gulp.task('style:prod', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.src.css}/main.scss`)
      .pipe(bulkSass())
      .pipe(sass().on('error', sass.logError))
      .pipe(gcmq())
      .pipe(postcss([autoprefixer('last 10 version', 'ie 10')]))
      .pipe(csso({
        restructure: true,
        debug: false
      }))
      .pipe(gulp.dest(path.dist.css))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('assets', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src([
        files.img,
        files.fonts,
        files.html,
        files.jsVendors,
        files.template,
        // files.locale,
      ], {
        base: baseUrl.src
      })
      .pipe(newer(baseUrl.dist))
      .pipe(gulp.dest(baseUrl.dist))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('webpack:dev', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.src.js}/app.js`)
      .pipe(webpackGulp({
        watch: true,
        watchOptions: {
          aggregateTimeout: 300
        },
        devtool: 'source-map',
        entry: {
          app: `${path.src.js}/app.js`,
        },
        plugins: [
          // new UglifyJSPlugin({
          //   uglifyOptions: {
          //     beautify: false,
          //     ecma: 6,
          //     compress: true,
          //     comments: false
          //   }
          // }),
          // new ProgressBarPlugin()
        ],
        output: {
          filename: '[name].js',
        }
      }))
      .pipe(gulp.dest(path.dist.js))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('templater', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(files.html)
      .pipe(nunjucks.compile(JSON.parse(fs.readFileSync(`${baseUrl.src}/data.json`, 'utf8'))))
      .on('error', function (err) {
        console.log('gulp-data error: ' + err)
      })
      .pipe(gulp.dest(baseUrl.dist))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

// Оптимизация
gulp.task('svg:injection', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.dist.css}/*.css`)
      .pipe(svgInline({
        maxImageSize: 8 * 1024,
        extensions: [/.svg/ig],
      }))
      .pipe(gulp.dest(path.dist.css))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('brotli', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${baseUrl.dist}/**/*.*`)
      .pipe(brotli.compress())
      .pipe(gulp.dest(`${baseUrl.dist}`))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('zopfli', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${baseUrl.dist}/**/*.*`)
      .pipe(zopfli({
        zopfliOptions: {
          verbose: true,
          numiterations: 50,
        }
      }))
      .pipe(gulp.dest(`${baseUrl.dist}`))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('webp', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.src.img}/**/*.{jpeg,jpg,png}`)
      .pipe(webp({
        method: 0, //0 (fastest) and 6 (slowest)
        lossless: true,
        quality: 80, //between 0 and 100
      }))
      .pipe(gulp.dest(`${path.dist.img}`))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('font', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.src.fonts}/*.ttf`)
      .pipe(fontmin({
        text: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя1234567890-=!@#$%^&*()_+,."№;:/\\?'
      }))
      .pipe(rename((path) => {
        path.basename += '.min'
      }))
      .pipe(gulp.dest(`${path.src.fonts}`))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

// Таски
gulp.task('compress:prod', gulp.parallel('brotli', 'zopfli'));

gulp.task('build:dev', gulp.series('svg:sprite', gulp.parallel('assets', 'style:dev', 'webpack:dev', 'templater', 'browser-sync', 'watch:dev')));
