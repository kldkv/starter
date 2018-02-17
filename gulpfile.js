'use sctrict';

const
      //core
      gulp =              require('gulp'),
      del =               require('del'),
      fs =                require('fs'),
      noopGulp =          require('gulp-noop'),
      noopWP =            require('noop-webpack-plugin'),
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
      sass =              require('gulp-sass'),
      bulkSass =          require('gulp-sass-bulk-import'),
      sourcemaps =        require('gulp-sourcemaps'),
      svgInline =         require('gulp-svg-inline'),
      svgSprite =         require('gulp-svg-sprite'),
      svgmin =            require('gulp-svgmin'),
      webp =              require('gulp-webp'),
      zopfli =            require('gulp-zopfli-fork'),
      iconfont =          require('gulp-iconfont'),
      consolidate =       require('gulp-consolidate'),
      //post css
      autoprefixer =      require('autoprefixer'),
      // colorblind = require('postcss-colorblind'),
      // webpack
      webpack =           require('webpack'),
      webpackGulp =       require('webpack-stream'),
      UglifyJSPlugin =    require('uglifyjs-webpack-plugin'),
      ProgressBarPlugin = require('progress-bar-webpack-plugin');

const ENV    = process.env.NODE_ENV,
      isProd = ENV === 'production',
      isDev  = ENV === 'development',
      err    = event => console.error(`${event}`);

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
    img:    `${baseUrl.dist}/img/`,
    fonts:  `${baseUrl.dist}/fonts/`,
    locale: `${baseUrl.dist}/locale/`,
  },
  src: {
    html:      `${baseUrl.src}/`,
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
  jsVendors:          `${baseUrl.src}/js/vendors/**/*.{js,map}`,
  js:                 `${baseUrl.src}/js/app/*.js`,
  css:                `${baseUrl.src}/css/**/*.{scss,css}`,
  img:                `${baseUrl.src}/img/**/*.*`,
  svgSprite:          `${baseUrl.src}/img/sprite/svg/**/*.svg`,
  svgSpriteColorize:  `${baseUrl.src}/img/sprite/svg/colorize/*.svg`,
  svgSpriteColorless: `${baseUrl.src}/img/sprite/svg/colorless/*.svg`,
  fonts:              `${baseUrl.src}/fonts/**/*.{woff,woff2}`,
  locale:             `${baseUrl.src}/locale/*.js`
};

if (typeof ENV === 'undefined') {
  console.log('⚠️ ALARM ⚠️');
  console.log('You are not set NODE_ENV. Try "npm run gulp-dev"');
  console.log('⚠️ ALARM ⚠️');
}

// Утилиты
gulp.task('clean', () => {
  return new Promise((resolved, rejected) => {
    del(baseUrl.dist).then((path) => {
      return resolved();
    });
  });
});

gulp.task('watch', () => {
  gulp.watch([
    files.img,
    files.fonts,
    files.html,
    files.jsVendors,
    files.template,
    files.locale,
  ], gulp.parallel('assets', 'svg:sprite', 'svg:injection'));

  gulp.watch([
    files.css
  ], gulp.parallel('style'));

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

gulp.task('style', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${files.css}`)
      .pipe(isDev ? sourcemaps.init() : noopGulp())
      .pipe(sass().on('error', sass.logError))
      .pipe(gcmq())
      .pipe(postcss([autoprefixer('last 2 version', 'ie > 10', 'safari > 6')]))
      .pipe(isProd ? csso({
        restructure: true,
        debug: false
      }) : noopGulp())
      .pipe(isDev ? sourcemaps.write('./maps') : noopGulp())
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
        files.locale,
      ], {
        base: baseUrl.src
      })
      .pipe(newer(baseUrl.dist))
      .pipe(gulp.dest(baseUrl.dist))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

gulp.task('webpack', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src(`${path.src.js}/app.js`)
      .pipe(webpackGulp({
        watch: isDev ? true : false,
        watchOptions: {
          aggregateTimeout: 300
        },
        devtool: 'source-map',
        entry: {
          app: `${path.src.js}/app.js`,
        },
        plugins: [
          isProd ? new UglifyJSPlugin({
            uglifyOptions: {
              beautify: false,
              ecma: 6,
              compress: true,
              comments: false
            }
          }) : noopWP,
          new ProgressBarPlugin()
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

gulp.task('ifont', () => {
  return new Promise((resolved, rejected) => {
    gulp
      .src('./src/img/sprite/svg/colorless/*.svg')
      .pipe(iconfont({
        fontName: 'ifont',
        prependUnicode: true,
        formats: ['ttf'],
        normalize: true,
        fontHeight: 1001
      }))
      .on('glyphs', (glyphs, options) => {
        gulp
          .src(`${path.src.css}/_libs/_ifont.tmpl.scss`)
          .pipe(consolidate('lodash', {
            glyphs: glyphs.map((glyph) => {
              return {
                name: glyph.name,
                codepoint: glyph.unicode[0].charCodeAt(0)
              }
            }),
            fontName: 'ifont',
            fontPath: './../fonts/',
            className: 'ifont'
          }))
          .pipe(rename((path) => {
            path.basename = '_ifont'
          }))
          .pipe(gulp.dest(`${path.src.css}/_libs`))
      })
      .pipe(gulp.dest(`${path.src.css}`))
      .on('end', () => resolved())
      .on('error', () => rejected())
  });
});

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
                template: `${path.src.css}/_libs/_svg-sprite.tmpl.scss`,
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
        text: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя1234567890-=!@#$%^&*()_+,."№;:/\\?\''
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
gulp.task('compress', gulp.parallel('brotli', 'zopfli'));

gulp.task('build', gulp.series('svg:sprite', gulp.parallel('assets', 'style', 'webpack', 'templater')));

gulp.task('dev', gulp.series('svg:sprite', gulp.parallel('assets', 'style', 'webpack', 'templater', 'watch')));

gulp.task('dev:browserSync', gulp.series('svg:sprite', gulp.parallel('assets', 'style', 'webpack', 'templater', 'browser-sync', 'watch')));