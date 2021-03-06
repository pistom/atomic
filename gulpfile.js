/**
 * Gulp Packages
 */

// General
var gulp = require('gulp');
var fs = require('fs');
var del = require('del');
var lazypipe = require('lazypipe');
var plumber = require('gulp-plumber');
var flatten = require('gulp-flatten');
var tap = require('gulp-tap');
var rename = require('gulp-rename');
var header = require('gulp-header');
var footer = require('gulp-footer');
var watch = require('gulp-watch');
var livereload = require('gulp-livereload');
var package = require('./package.json');

// Scripts and tests
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var optimizejs = require('gulp-optimize-js');
var karma = require('gulp-karma');


/**
 * Paths to project folders
 */

var paths = {
	input: 'src/**/*',
	output: 'dist/',
	scripts: {
		input: 'src/*',
		output: 'dist/'
	},
	test: {
		input: 'src/**/*.js',
		karma: 'test/karma.conf.js',
		spec: 'test/spec/**/*.js',
		coverage: 'test/coverage/',
		results: 'test/results/'
	},
};


/**
 * Template for banner to add to file headers
 */

var banner = '/*! <%= package.title %> v<%= package.version %> | (c) ' + new Date().getFullYear() + ' @toddmotto | <%= package.homepage %> | <%= package.license %> */\n';


/**
 * Gulp Taks
 */

// Lint, minify, and concatenate scripts
gulp.task('build:scripts', ['clean:dist'], function() {
	var jsTasks = lazypipe()
		.pipe(header, banner, { package : package })
		.pipe(optimizejs)
		.pipe(gulp.dest, paths.scripts.output)
		.pipe(rename, { suffix: '.min' })
		.pipe(uglify)
		.pipe(optimizejs)
		.pipe(header, banner, { package : package })
		.pipe(gulp.dest, paths.scripts.output);

	return gulp.src(paths.scripts.input)
		.pipe(plumber())
		.pipe(tap(function (file, t) {
			if ( file.isDirectory() ) {
				var name = file.relative + '.js';
				return gulp.src(file.path + '/*.js')
					.pipe(concat(name))
					.pipe(jsTasks());
			}
		}))
		.pipe(jsTasks());
});

// Lint scripts
gulp.task('lint:scripts', function () {
	return gulp.src(paths.scripts.input)
		.pipe(plumber())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'));
});

// Remove pre-existing content from output folders
gulp.task('clean:dist', function () {
	del.sync([
		paths.output
	]);
});

// Remove pre-existing content from text folders
gulp.task('clean:test', function () {
	del.sync([
		paths.test.coverage,
		paths.test.results
	]);
});

// Run unit tests
gulp.task('test:scripts', ['clean:test'], function() {
	return gulp.src([paths.test.input].concat([paths.test.spec]))
		.pipe(plumber())
		.pipe(karma({ configFile: paths.test.karma }))
		.on('error', function(err) { throw err; });
});

// Generate documentation
gulp.task('build:docs', ['compile', 'clean:docs'], function() {
	return gulp.src(paths.docs.input)
		.pipe(plumber())
		.pipe(fileinclude({
			prefix: '@@',
			basepath: '@file'
		}))
		.pipe(tap(function (file, t) {
			if ( /\.md|\.markdown/.test(file.path) ) {
				return t.through(markdown);
			}
		}))
		.pipe(header(fs.readFileSync(paths.docs.templates + '/_header.html', 'utf8')))
		.pipe(footer(fs.readFileSync(paths.docs.templates + '/_footer.html', 'utf8')))
		.pipe(gulp.dest(paths.docs.output));
});

// Copy distribution files to docs
gulp.task('copy:dist', ['compile', 'clean:docs'], function() {
	return gulp.src(paths.output + '/**')
		.pipe(plumber())
		.pipe(gulp.dest(paths.docs.output + '/dist'));
});

// Copy documentation assets to docs
gulp.task('copy:assets', ['clean:docs'], function() {
	return gulp.src(paths.docs.assets)
		.pipe(plumber())
		.pipe(gulp.dest(paths.docs.output + '/assets'));
});

// Remove prexisting content from docs folder
gulp.task('clean:docs', function () {
	return del.sync(paths.docs.output);
});

// Spin up livereload server and listen for file changes
gulp.task('listen', function () {
	livereload.listen();
	gulp.watch(paths.input).on('change', function(file) {
		gulp.start('default');
		gulp.start('refresh');
	});
});

// Run livereload after file change
gulp.task('refresh', ['compile', 'docs'], function () {
	livereload.changed();
});


/**
 * Task Runners
 */

// Compile files
gulp.task('compile', [
	'lint:scripts',
	'clean:dist',
	'build:scripts'
]);

// Compile files and generate docs (default)
gulp.task('default', [
	'compile'
]);

// Compile files and generate docs when something changes
gulp.task('watch', [
	'listen',
	'default'
]);

// Run unit tests
gulp.task('test', [
	'default',
	'test:scripts'
]);