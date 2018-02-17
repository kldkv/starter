import $ from 'jquery';
import _ from 'underscore';
import Bb from 'backbone';
import Mn from 'backbone.marionette';

let a = true;

console.log(`Test babel: ${a}`)
if (Mn.VERSION) {
  console.log(`Success import from modules. Mn version is ${Mn.VERSION}`)
}