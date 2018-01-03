(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ko = factory());
}(this, (function () { 'use strict';

//
// Array utilities
//
/* eslint no-cond-assign: 0 */

function arrayForEach(array, action) {
    for (var i = 0, j = array.length; i < j; i++)
        action(array[i], i);
}

function arrayIndexOf(array, item) {
    // IE9
    if (typeof Array.prototype.indexOf == "function")
        return Array.prototype.indexOf.call(array, item);
    for (var i = 0, j = array.length; i < j; i++)
        if (array[i] === item)
            return i;
    return -1;
}

function arrayFirst(array, predicate, predicateOwner) {
    for (var i = 0, j = array.length; i < j; i++)
        if (predicate.call(predicateOwner, array[i], i))
            return array[i];
    return null;
}

function arrayRemoveItem(array, itemToRemove) {
    var index = arrayIndexOf(array, itemToRemove);
    if (index > 0) {
        array.splice(index, 1);
    }
    else if (index === 0) {
        array.shift();
    }
}

function arrayGetDistinctValues(array) {
    array = array || [];
    var result = [];
    for (var i = 0, j = array.length; i < j; i++) {
        if (arrayIndexOf(result, array[i]) < 0)
            result.push(array[i]);
    }
    return result;
}

function arrayMap(array, mapping) {
    array = array || [];
    var result = [];
    for (var i = 0, j = array.length; i < j; i++)
        result.push(mapping(array[i], i));
    return result;
}

function arrayFilter(array, predicate) {
    array = array || [];
    var result = [];
    for (var i = 0, j = array.length; i < j; i++)
        if (predicate(array[i], i))
            result.push(array[i]);
    return result;
}

function arrayPushAll(array, valuesToPush) {
    if (valuesToPush instanceof Array)
        array.push.apply(array, valuesToPush);
    else
        for (var i = 0, j = valuesToPush.length; i < j; i++)
            array.push(valuesToPush[i]);
    return array;
}

function addOrRemoveItem(array, value, included) {
    var existingEntryIndex = arrayIndexOf(typeof array.peek === 'function' ? array.peek() : array, value);
    if (existingEntryIndex < 0) {
        if (included)
            array.push(value);
    } else {
        if (!included)
            array.splice(existingEntryIndex, 1);
    }
}


function makeArray(arrayLikeObject) {
    var result = [];
    for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
        result.push(arrayLikeObject[i]);
    }
    return result;
}


function range(min, max) {
    min = typeof min === 'function' ? min() : min;
    max = typeof max === 'function' ? max() : max;
    var result = [];
    for (var i = min; i <= max; i++)
        result.push(i);
    return result;
}

// Go through the items that have been added and deleted and try to find matches between them.
function findMovesInArrayComparison(left, right, limitFailedCompares) {
    if (left.length && right.length) {
        var failedCompares, l, r, leftItem, rightItem;
        for (failedCompares = l = 0; (!limitFailedCompares || failedCompares < limitFailedCompares) && (leftItem = left[l]); ++l) {
            for (r = 0; rightItem = right[r]; ++r) {
                if (leftItem['value'] === rightItem['value']) {
                    leftItem['moved'] = rightItem['index'];
                    rightItem['moved'] = leftItem['index'];
                    right.splice(r, 1);         // This item is marked as moved; so remove it from right list
                    failedCompares = r = 0;     // Reset failed compares count because we're checking for consecutive failures
                    break;
                }
            }
            failedCompares += r;
        }
    }
}



var statusNotInOld = 'added';
var statusNotInNew = 'deleted';

    // Simple calculation based on Levenshtein distance.
function compareArrays(oldArray, newArray, options) {
    // For backward compatibility, if the third arg is actually a bool, interpret
    // it as the old parameter 'dontLimitMoves'. Newer code should use { dontLimitMoves: true }.
    options = (typeof options === 'boolean') ? { 'dontLimitMoves': options } : (options || {});
    oldArray = oldArray || [];
    newArray = newArray || [];

    if (oldArray.length < newArray.length)
        return compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, options);
    else
        return compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, options);
}


function compareSmallArrayToBigArray(smlArray, bigArray, statusNotInSml, statusNotInBig, options) {
    var myMin = Math.min,
        myMax = Math.max,
        editDistanceMatrix = [],
        smlIndex, smlIndexMax = smlArray.length,
        bigIndex, bigIndexMax = bigArray.length,
        compareRange = (bigIndexMax - smlIndexMax) || 1,
        maxDistance = smlIndexMax + bigIndexMax + 1,
        thisRow, lastRow,
        bigIndexMaxForRow, bigIndexMinForRow;

    for (smlIndex = 0; smlIndex <= smlIndexMax; smlIndex++) {
        lastRow = thisRow;
        editDistanceMatrix.push(thisRow = []);
        bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
        bigIndexMinForRow = myMax(0, smlIndex - 1);
        for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
            if (!bigIndex)
                thisRow[bigIndex] = smlIndex + 1;
            else if (!smlIndex)  // Top row - transform empty array into new array via additions
                thisRow[bigIndex] = bigIndex + 1;
            else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                thisRow[bigIndex] = lastRow[bigIndex - 1];                  // copy value (no edit)
            else {
                var northDistance = lastRow[bigIndex] || maxDistance;       // not in big (deletion)
                var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
            }
        }
    }

    var editScript = [], meMinusOne, notInSml = [], notInBig = [];
    for (smlIndex = smlIndexMax, bigIndex = bigIndexMax; smlIndex || bigIndex;) {
        meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
        if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
            notInSml.push(editScript[editScript.length] = {     // added
                'status': statusNotInSml,
                'value': bigArray[--bigIndex],
                'index': bigIndex });
        } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
            notInBig.push(editScript[editScript.length] = {     // deleted
                'status': statusNotInBig,
                'value': smlArray[--smlIndex],
                'index': smlIndex });
        } else {
            --bigIndex;
            --smlIndex;
            if (!options['sparse']) {
                editScript.push({
                    'status': "retained",
                    'value': bigArray[bigIndex] });
            }
        }
    }

    // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
    // smlIndexMax keeps the time complexity of this algorithm linear.
    findMovesInArrayComparison(notInBig, notInSml, !options['dontLimitMoves'] && smlIndexMax * 10);

    return editScript.reverse();
}

//
// This becomes ko.options
// --
//
// This is the root 'options', which must be extended by others.

var options = {
  deferUpdates: false,

  useOnlyNativeEvents: false,

  protoProperty: '__ko_proto__',

    // Modify the default attribute from `data-bind`.
  defaultBindingAttribute: 'data-bind',

    // Enable/disable <!-- ko binding: ... -> style bindings
  allowVirtualElements: true,

    // Global variables that can be accessed from bindings.
  bindingGlobals: window,

    // An instance of the binding provider.
  bindingProviderInstance: null,

    // jQuery will be automatically set to window.jQuery in applyBindings
    // if it is (strictly equal to) undefined.  Set it to false or null to
    // disable automatically setting jQuery.
  jQuery: window && window.jQuery,

  Promise: window && window.Promise,

  taskScheduler: null,

  debug: false,

    // Filters for bindings
    //   data-bind="expression | filter_1 | filter_2"
  filters: {},

  onError: function (e) { throw e },

  set: function (name, value) {
    options[name] = value;
  }
};

Object.defineProperty(options, '$', {
  get: function () { return options.jQuery }
});

//
// Error handling
// ---
//
// The default onError handler is to re-throw.
function catchFunctionErrors(delegate) {
    return options.onError ? function () {
        try {
            return delegate.apply(this, arguments);
        } catch (e) {
            options.onError(e);
        }
    } : delegate;
}

function deferError(error) {
    safeSetTimeout(function () { options.onError(error); }, 0);
}


function safeSetTimeout(handler, timeout) {
    return setTimeout(catchFunctionErrors(handler), timeout);
}

//
// Asynchronous functionality
// ---
function throttle(callback, timeout) {
    var timeoutInstance;
    return function () {
        if (!timeoutInstance) {
            timeoutInstance = safeSetTimeout(function () {
                timeoutInstance = undefined;
                callback();
            }, timeout);
        }
    };
}

function debounce(callback, timeout) {
    var timeoutInstance;
    return function () {
        clearTimeout(timeoutInstance);
        timeoutInstance = safeSetTimeout(callback, timeout);
    };
}

//
// Detection and Workarounds for Internet Explorer
//
/* eslint no-empty: 0 */

// Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness)
// Note that, since IE 10 does not support conditional comments, the following logic only detects IE < 10.
// Currently this is by design, since IE 10+ behaves correctly when treated as a standard browser.
// If there is a future need to detect specific versions of IE10+, we will amend this.
var ieVersion = document && (function() {
    var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

    // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
    while (
        div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
        iElems[0]
    ) {}
    return version > 4 ? version : undefined;
}());

var isIe6 = ieVersion === 6;
var isIe7 = ieVersion === 7;

//
// Object functions
//

function extend(target, source) {
    if (source) {
        for(var prop in source) {
            if(source.hasOwnProperty(prop)) {
                target[prop] = source[prop];
            }
        }
    }
    return target;
}

function objectForEach(obj, action) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            action(prop, obj[prop]);
        }
    }
}


function objectMap(source, mapping) {
    if (!source)
        return source;
    var target = {};
    for (var prop in source) {
        if (source.hasOwnProperty(prop)) {
            target[prop] = mapping(source[prop], prop, source);
        }
    }
    return target;
}


function getObjectOwnProperty(obj, propName) {
    return obj.hasOwnProperty(propName) ? obj[propName] : undefined;
}


function clonePlainObjectDeep(obj, seen) {
    if (!seen) { seen = []; }

    if (!obj || typeof obj !== 'object'
        || obj.constructor !== Object
        || seen.indexOf(obj) !== -1) {
        return obj;
    }

    // Anything that makes it below is a plain object that has not yet
    // been seen/cloned.
    seen.push(obj);

    var result = {};
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            result[prop] = clonePlainObjectDeep(obj[prop], seen);
        }
    }
    return result;
}

//
// Prototype Functions
//
var protoProperty = options.protoProperty;

var canSetPrototype = ({ __proto__: [] } instanceof Array);

function setPrototypeOf(obj, proto) {
    obj.__proto__ = proto;
    return obj;
}

var setPrototypeOfOrExtend = canSetPrototype ? setPrototypeOf : extend;

function hasPrototype(instance, prototype) {
    if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) return false;
    if (instance[protoProperty] === prototype) return true;
    return hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
}

//
// String (and JSON)
//


function stringTrim (string) {
    return string === null || string === undefined ? '' :
        string.trim ?
            string.trim() :
            string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
}


function stringStartsWith (string, startsWith) {
    string = string || "";
    if (startsWith.length > string.length)
        return false;
    return string.substring(0, startsWith.length) === startsWith;
}


function parseJson (jsonString) {
    if (typeof jsonString == "string") {
        jsonString = stringTrim(jsonString);
        if (jsonString) {
            if (JSON && JSON.parse) // Use native parsing where available
                return JSON.parse(jsonString);
            return (new Function("return " + jsonString))(); // Fallback on less safe parsing for older browsers
        }
    }
    return null;
}


function stringifyJson (data, replacer, space) {   // replacer and space are optional
    if (!JSON || !JSON.stringify)
        throw new Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");
    return JSON.stringify(typeof data === 'function' ? data() : data, replacer, space);
}

//
// ES6 Symbols
//

var useSymbols = typeof Symbol === 'function';

function createSymbolOrString(identifier) {
    return useSymbols ? Symbol(identifier) : identifier;
}

//
// DOM - CSS
//

// For details on the pattern for changing node classes
// see: https://github.com/knockout/knockout/issues/1597
var cssClassNameRegex = /\S+/g;


function toggleDomNodeCssClass(node, classNames, shouldHaveClass) {
    var addOrRemoveFn;
    if (!classNames) { return; }
    if (typeof node.classList === 'object') {
        addOrRemoveFn = node.classList[shouldHaveClass ? 'add' : 'remove'];
        arrayForEach(classNames.match(cssClassNameRegex), function(className) {
            addOrRemoveFn.call(node.classList, className);
        });
    } else if (typeof node.className['baseVal'] === 'string') {
        // SVG tag .classNames is an SVGAnimatedString instance
        toggleObjectClassPropertyString(node.className, 'baseVal', classNames, shouldHaveClass);
    } else {
        // node.className ought to be a string.
        toggleObjectClassPropertyString(node, 'className', classNames, shouldHaveClass);
    }
}


function toggleObjectClassPropertyString(obj, prop, classNames, shouldHaveClass) {
    // obj/prop is either a node/'className' or a SVGAnimatedString/'baseVal'.
    var currentClassNames = obj[prop].match(cssClassNameRegex) || [];
    arrayForEach(classNames.match(cssClassNameRegex), function(className) {
        addOrRemoveItem(currentClassNames, className, shouldHaveClass);
    });
    obj[prop] = currentClassNames.join(" ");
}

//
// jQuery
//
// TODO: deprecate in favour of options.$

var jQueryInstance = window && window.jQuery;

function jQuerySetInstance(jquery) {
    jQueryInstance = jquery;
}

//
// Information about the DOM
//
function domNodeIsContainedBy (node, containedByNode) {
    if (node === containedByNode)
        return true;
    if (node.nodeType === 11)
        return false; // Fixes issue #1162 - can't use node.contains for document fragments on IE8
    if (containedByNode.contains)
        return containedByNode.contains(node.nodeType !== 1 ? node.parentNode : node);
    if (containedByNode.compareDocumentPosition)
        return (containedByNode.compareDocumentPosition(node) & 16) == 16;
    while (node && node != containedByNode) {
        node = node.parentNode;
    }
    return !!node;
}

function domNodeIsAttachedToDocument (node) {
    return domNodeIsContainedBy(node, node.ownerDocument.documentElement);
}

function anyDomNodeIsAttachedToDocument(nodes) {
    return !!arrayFirst(nodes, domNodeIsAttachedToDocument);
}

function tagNameLower(element) {
    // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
    // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
    // we don't need to do the .toLowerCase() as it will always be lower case anyway.
    return element && element.tagName && element.tagName.toLowerCase();
}

function isDomElement(obj) {
    if (window.HTMLElement) {
        return obj instanceof HTMLElement;
    } else {
        return obj && obj.tagName && obj.nodeType === 1;
    }
}

function isDocumentFragment(obj) {
    if (window.DocumentFragment) {
        return obj instanceof DocumentFragment;
    } else {
        return obj && obj.nodeType === 11;
    }
}

//
// DOM node data
//
//
var dataStoreKeyExpandoPropertyName = "__ko__data" + new Date();
var dataStore;
var uniqueId = 0;
var get;
var set;
var clear;

/**
 * --- Legacy getter/setter (may cause memory leaks) ---
 */
function getAll(node, createIfNotFound) {
    var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
    var hasExistingDataStore = dataStoreKey && (dataStoreKey !== "null") && dataStore[dataStoreKey];
    if (!hasExistingDataStore) {
        if (!createIfNotFound)
            return undefined;
        dataStoreKey = node[dataStoreKeyExpandoPropertyName] = "ko" + uniqueId++;
        dataStore[dataStoreKey] = {};
    }
    return dataStore[dataStoreKey];
}

function legacyGet(node, key) {
    var allDataForNode = getAll(node, false);
    return allDataForNode === undefined ? undefined : allDataForNode[key];
}

function legacySet(node, key, value) {
    if (value === undefined) {
        // Make sure we don't actually create a new domData key if we are actually deleting a value
        if (getAll(node, false) === undefined)
            return;
    }
    var allDataForNode = getAll(node, true);
    allDataForNode[key] = value;
}

function legacyClear(node) {
    var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
    if (dataStoreKey) {
        delete dataStore[dataStoreKey];
        node[dataStoreKeyExpandoPropertyName] = null;
        return true; // Exposing "did clean" flag purely so specs can infer whether things have been cleaned up as intended
    }
    return false;
}

/**
 * WeakMap get/set/clear
 */

function wmGet(node, key) {
    return (dataStore.get(node) || {})[key];
}

function wmSet(node, key, value) {
    var dataForNode;
    if (dataStore.has(node)) {
        dataForNode = dataStore.get(node);
    } else {
        dataForNode = {};
        dataStore.set(node, dataForNode);
    }
    dataForNode[key] = value;
}

function wmClear (node) {
  return dataStore.delete(node)
}


if ('WeakMap' in window) {
    dataStore = new WeakMap();
    get = wmGet;
    set = wmSet;
    clear = wmClear;
} else {
    dataStore = {};
    get = legacyGet;
    set = legacySet;
    clear = legacyClear;
}



/**
 * Create a unique key-string identifier.
 * FIXME: This should be deprecated.
 */
function nextKey() {
    return (uniqueId++) + dataStoreKeyExpandoPropertyName;
}





var data = Object.freeze({
	nextKey: nextKey,
	get get () { return get; },
	get set () { return set; },
	get clear () { return clear; }
});

//
// DOM node disposal
//
/* eslint no-cond-assign: 0 */
var domDataKey = nextKey();
// Node types:
// 1: Element
// 8: Comment
// 9: Document
var cleanableNodeTypes = { 1: true, 8: true, 9: true };
var cleanableNodeTypesWithDescendants = { 1: true, 9: true };

function getDisposeCallbacksCollection(node, createIfNotFound) {
    var allDisposeCallbacks = get(node, domDataKey);
    if ((allDisposeCallbacks === undefined) && createIfNotFound) {
        allDisposeCallbacks = [];
        set(node, domDataKey, allDisposeCallbacks);
    }
    return allDisposeCallbacks;
}
function destroyCallbacksCollection(node) {
    set(node, domDataKey, undefined);
}

function cleanSingleNode(node) {
    // Run all the dispose callbacks
    var callbacks = getDisposeCallbacksCollection(node, false);
    if (callbacks) {
        callbacks = callbacks.slice(0); // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
        for (var i = 0; i < callbacks.length; i++)
            callbacks[i](node);
    }

    // Erase the DOM data
    clear(node);

    // Perform cleanup needed by external libraries (currently only jQuery, but can be extended)
    for (var i = 0, j = otherNodeCleanerFunctions.length; i < j; ++i) {
        otherNodeCleanerFunctions[i](node);
    }

    // Clear any immediate-child comment nodes, as these wouldn't have been found by
    // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
    if (cleanableNodeTypesWithDescendants[node.nodeType])
        cleanImmediateCommentTypeChildren(node);
}

function cleanImmediateCommentTypeChildren(nodeWithChildren) {
    var child, nextChild = nodeWithChildren.firstChild;
    while (child = nextChild) {
        nextChild = child.nextSibling;
        if (child.nodeType === 8)
            cleanSingleNode(child);
    }
}

// Exports
function addDisposeCallback(node, callback) {
    if (typeof callback != "function")
        throw new Error("Callback must be a function");
    getDisposeCallbacksCollection(node, true).push(callback);
}

function removeDisposeCallback(node, callback) {
    var callbacksCollection = getDisposeCallbacksCollection(node, false);
    if (callbacksCollection) {
        arrayRemoveItem(callbacksCollection, callback);
        if (callbacksCollection.length == 0)
            destroyCallbacksCollection(node);
    }
}

function cleanNode(node) {
    // First clean this node, where applicable
    if (cleanableNodeTypes[node.nodeType]) {
        cleanSingleNode(node);

        // ... then its descendants, where applicable
        if (cleanableNodeTypesWithDescendants[node.nodeType]) {
            // Clone the descendants list in case it changes during iteration
            var descendants = [];
            arrayPushAll(descendants, node.getElementsByTagName("*"));
            for (var i = 0, j = descendants.length; i < j; i++)
                cleanSingleNode(descendants[i]);
        }
    }
    return node;
}

function removeNode(node) {
    cleanNode(node);
    if (node.parentNode)
        node.parentNode.removeChild(node);
}


// Expose supplemental node cleaning functions.
var otherNodeCleanerFunctions = [];


// Special support for jQuery here because it's so commonly used.
// Many jQuery plugins (including jquery.tmpl) store data using jQuery's equivalent of domData
// so notify it to tear down any resources associated with the node & descendants here.
function cleanjQueryData(node) {
    var jQueryCleanNodeFn = jQueryInstance
        ? jQueryInstance.cleanData : null;

    if (jQueryCleanNodeFn) {
        jQueryCleanNodeFn([node]);
    }
}


otherNodeCleanerFunctions.push(cleanjQueryData);

//
// DOM Events
//

// Represent the known event types in a compact way, then at runtime transform it into a hash with event name as key (for fast lookup)
var knownEvents = {};
var knownEventTypesByEventName = {};

var keyEventTypeName = (navigator && /Firefox\/2/i.test(navigator.userAgent)) ? 'KeyboardEvent' : 'UIEvents';

knownEvents[keyEventTypeName] = ['keyup', 'keydown', 'keypress'];

knownEvents['MouseEvents'] = [
    'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover',
    'mouseout', 'mouseenter', 'mouseleave'];


objectForEach(knownEvents, function(eventType, knownEventsForType) {
    if (knownEventsForType.length) {
        for (var i = 0, j = knownEventsForType.length; i < j; i++)
            knownEventTypesByEventName[knownEventsForType[i]] = eventType;
    }
});


function isClickOnCheckableElement(element, eventType) {
    if ((tagNameLower(element) !== "input") || !element.type) return false;
    if (eventType.toLowerCase() != "click") return false;
    var inputType = element.type;
    return (inputType == "checkbox") || (inputType == "radio");
}


// Workaround for an IE9 issue - https://github.com/SteveSanderson/knockout/issues/406
var eventsThatMustBeRegisteredUsingAttachEvent = { 'propertychange': true };

function registerEventHandler(element, eventType, handler) {
    var wrappedHandler = catchFunctionErrors(handler);

    var mustUseAttachEvent = ieVersion && eventsThatMustBeRegisteredUsingAttachEvent[eventType];
    if (!options.useOnlyNativeEvents && !mustUseAttachEvent && jQueryInstance) {
        jQueryInstance(element).bind(eventType, wrappedHandler);
    } else if (!mustUseAttachEvent && typeof element.addEventListener == "function")
        element.addEventListener(eventType, wrappedHandler, false);
    else if (typeof element.attachEvent !== "undefined") {
        var attachEventHandler = function (event) { wrappedHandler.call(element, event); },
            attachEventName = "on" + eventType;
        element.attachEvent(attachEventName, attachEventHandler);

        // IE does not dispose attachEvent handlers automatically (unlike with addEventListener)
        // so to avoid leaks, we have to remove them manually. See bug #856
        addDisposeCallback(element, function() {
            element.detachEvent(attachEventName, attachEventHandler);
        });
    } else
        throw new Error("Browser doesn't support addEventListener or attachEvent");
}

function triggerEvent(element, eventType) {
    if (!(element && element.nodeType))
        throw new Error("element must be a DOM node when calling triggerEvent");

    // For click events on checkboxes and radio buttons, jQuery toggles the element checked state *after* the
    // event handler runs instead of *before*. (This was fixed in 1.9 for checkboxes but not for radio buttons.)
    // IE doesn't change the checked state when you trigger the click event using "fireEvent".
    // In both cases, we'll use the click method instead.
    var useClickWorkaround = isClickOnCheckableElement(element, eventType);

    if (!options.useOnlyNativeEvents && jQueryInstance && !useClickWorkaround) {
        jQueryInstance(element).trigger(eventType);
    } else if (typeof document.createEvent == "function") {
        if (typeof element.dispatchEvent == "function") {
            var eventCategory = knownEventTypesByEventName[eventType] || "HTMLEvents";
            var event = document.createEvent(eventCategory);
            event.initEvent(eventType, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, element);
            element.dispatchEvent(event);
        }
        else
            throw new Error("The supplied element doesn't support dispatchEvent");
    } else if (useClickWorkaround && element.click) {
        element.click();
    } else if (typeof element.fireEvent != "undefined") {
        element.fireEvent("on" + eventType);
    } else {
        throw new Error("Browser doesn't support triggering events");
    }
}

//
//  DOM node manipulation
//
function fixUpContinuousNodeArray(continuousNodeArray, parentNode) {
    // Before acting on a set of nodes that were previously outputted by a template function, we have to reconcile
    // them against what is in the DOM right now. It may be that some of the nodes have already been removed, or that
    // new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
    // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
    // So, this function translates the old "map" output array into its best guess of the set of current DOM nodes.
    //
    // Rules:
    //   [A] Any leading nodes that have been removed should be ignored
    //       These most likely correspond to memoization nodes that were already removed during binding
    //       See https://github.com/knockout/knockout/pull/440
    //   [B] Any trailing nodes that have been remove should be ignored
    //       This prevents the code here from adding unrelated nodes to the array while processing rule [C]
    //       See https://github.com/knockout/knockout/pull/1903
    //   [C] We want to output a continuous series of nodes. So, ignore any nodes that have already been removed,
    //       and include any nodes that have been inserted among the previous collection

    if (continuousNodeArray.length) {
        // The parent node can be a virtual element; so get the real parent node
        parentNode = (parentNode.nodeType === 8 && parentNode.parentNode) || parentNode;

        // Rule [A]
        while (continuousNodeArray.length && continuousNodeArray[0].parentNode !== parentNode)
            continuousNodeArray.splice(0, 1);

        // Rule [B]
        while (continuousNodeArray.length > 1 && continuousNodeArray[continuousNodeArray.length - 1].parentNode !== parentNode)
            continuousNodeArray.length--;

        // Rule [C]
        if (continuousNodeArray.length > 1) {
            var current = continuousNodeArray[0], last = continuousNodeArray[continuousNodeArray.length - 1];
            // Replace with the actual new continuous node set
            continuousNodeArray.length = 0;
            while (current !== last) {
                continuousNodeArray.push(current);
                current = current.nextSibling;
            }
            continuousNodeArray.push(last);
        }
    }
    return continuousNodeArray;
}

function setOptionNodeSelectionState (optionNode, isSelected) {
    // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
    if (ieVersion < 7)
        optionNode.setAttribute("selected", isSelected);
    else
        optionNode.selected = isSelected;
}


function forceRefresh(node) {
    // Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209
    if (ieVersion >= 9) {
        // For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
        var elem = node.nodeType == 1 ? node : node.parentNode;
        if (elem.style)
            elem.style.zoom = elem.style.zoom;
    }
}

function ensureSelectElementIsRenderedCorrectly(selectElement) {
    // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
    // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
    // Also fixes IE7 and IE8 bug that causes selects to be zero width if enclosed by 'if' or 'with'. (See issue #839)
    if (ieVersion) {
        var originalWidth = selectElement.style.width;
        selectElement.style.width = 0;
        selectElement.style.width = originalWidth;
    }
}

/* eslint no-cond-assign: 0 */
//
// Virtual Elements
//
//
// "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
// may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
// If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
// of that virtual hierarchy
//
// The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
// without having to scatter special cases all over the binding and templating code.

// IE 9 cannot reliably read the "nodeValue" property of a comment node (see https://github.com/SteveSanderson/knockout/issues/186)
// but it does give them a nonstandard alternative property called "text" that it can read reliably. Other browsers don't have that property.
// So, use node.text where available, and node.nodeValue elsewhere
var commentNodesHaveTextProperty = document && document.createComment("test").text === "<!--test-->";

var startCommentRegex = commentNodesHaveTextProperty ? /^<!--\s*ko(?:\s+([\s\S]+))?\s*-->$/ : /^\s*ko(?:\s+([\s\S]+))?\s*$/;
var endCommentRegex =   commentNodesHaveTextProperty ? /^<!--\s*\/ko\s*-->$/ : /^\s*\/ko\s*$/;
var htmlTagsWithOptionallyClosingChildren = { 'ul': true, 'ol': true };

function isStartComment(node) {
    return (node.nodeType == 8) && startCommentRegex.test(commentNodesHaveTextProperty ? node.text : node.nodeValue);
}

function isEndComment(node) {
    return (node.nodeType == 8) && endCommentRegex.test(commentNodesHaveTextProperty ? node.text : node.nodeValue);
}

function getVirtualChildren(startComment, allowUnbalanced) {
    var currentNode = startComment;
    var depth = 1;
    var children = [];
    while (currentNode = currentNode.nextSibling) {
        if (isEndComment(currentNode)) {
            depth--;
            if (depth === 0)
                return children;
        }

        children.push(currentNode);

        if (isStartComment(currentNode))
            depth++;
    }
    if (!allowUnbalanced)
        throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
    return null;
}

function getMatchingEndComment(startComment, allowUnbalanced) {
    var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
    if (allVirtualChildren) {
        if (allVirtualChildren.length > 0)
            return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
        return startComment.nextSibling;
    } else
        return null; // Must have no matching end comment, and allowUnbalanced is true
}

function getUnbalancedChildTags(node) {
    // e.g., from <div>OK</div><!-- ko blah --><span>Another</span>, returns: <!-- ko blah --><span>Another</span>
    //       from <div>OK</div><!-- /ko --><!-- /ko -->,             returns: <!-- /ko --><!-- /ko -->
    var childNode = node.firstChild, captureRemaining = null;
    if (childNode) {
        do {
            if (captureRemaining)                   // We already hit an unbalanced node and are now just scooping up all subsequent nodes
                captureRemaining.push(childNode);
            else if (isStartComment(childNode)) {
                var matchingEndComment = getMatchingEndComment(childNode, /* allowUnbalanced: */ true);
                if (matchingEndComment)             // It's a balanced tag, so skip immediately to the end of this virtual set
                    childNode = matchingEndComment;
                else
                    captureRemaining = [childNode]; // It's unbalanced, so start capturing from this point
            } else if (isEndComment(childNode)) {
                captureRemaining = [childNode];     // It's unbalanced (if it wasn't, we'd have skipped over it already), so start capturing
            }
        } while (childNode = childNode.nextSibling);
    }
    return captureRemaining;
}

var allowedBindings = {};
var hasBindingValue = isStartComment;

function childNodes(node) {
    return isStartComment(node) ? getVirtualChildren(node) : node.childNodes;
}

function emptyNode(node) {
    if (!isStartComment(node))
        emptyDomNode(node);
    else {
        var virtualChildren = childNodes(node);
        for (var i = 0, j = virtualChildren.length; i < j; i++)
            removeNode(virtualChildren[i]);
    }
}

function setDomNodeChildren$1(node, childNodes) {
    if (!isStartComment(node))
        setDomNodeChildren(node, childNodes);
    else {
        emptyNode(node);
        var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
        for (var i = 0, j = childNodes.length; i < j; i++)
            endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
    }
}

function prepend(containerNode, nodeToPrepend) {
    if (!isStartComment(containerNode)) {
        if (containerNode.firstChild)
            containerNode.insertBefore(nodeToPrepend, containerNode.firstChild);
        else
            containerNode.appendChild(nodeToPrepend);
    } else {
        // Start comments must always have a parent and at least one following sibling (the end comment)
        containerNode.parentNode.insertBefore(nodeToPrepend, containerNode.nextSibling);
    }
}

function insertAfter(containerNode, nodeToInsert, insertAfterNode) {
    if (!insertAfterNode) {
        prepend(containerNode, nodeToInsert);
    } else if (!isStartComment(containerNode)) {
        // Insert after insertion point
        if (insertAfterNode.nextSibling)
            containerNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
        else
            containerNode.appendChild(nodeToInsert);
    } else {
        // Children of start comments must always have a parent and at least one following sibling (the end comment)
        containerNode.parentNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
    }
}

function firstChild(node) {
    if (!isStartComment(node)) {
        return node.firstChild;
    }
    if (!node.nextSibling || isEndComment(node.nextSibling)) {
        return null;
    }
    return node.nextSibling;
}


function lastChild(node) {
    var nextChild = firstChild(node),
        lastChildNode;

    do {
        lastChildNode = nextChild;
    } while (nextChild = nextSibling(nextChild));

    return lastChildNode;
}

function nextSibling(node) {
    if (isStartComment(node))
        node = getMatchingEndComment(node);
    if (node.nextSibling && isEndComment(node.nextSibling))
        return null;
    return node.nextSibling;
}

function previousSibling(node) {
    var depth = 0;
    do {
        if (node.nodeType === 8) {
            if (isStartComment(node)) {
                if (--depth === 0) {
                    return node;
                }
            } else if (isEndComment(node)) {
                depth++;
            }
        } else {
            if (depth === 0) { return node; }
        }
    } while (node = node.previousSibling);
    return;
}

function virtualNodeBindingValue(node) {
    var regexMatch = (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(startCommentRegex);
    return regexMatch ? regexMatch[1] : null;
}

function normaliseVirtualElementDomStructure(elementVerified) {
    // Workaround for https://github.com/SteveSanderson/knockout/issues/155
    // (IE <= 8 or IE 9 quirks mode parses your HTML weirdly, treating closing </li> tags as if they don't exist, thereby moving comment nodes
    // that are direct descendants of <ul> into the preceding <li>)
    if (!htmlTagsWithOptionallyClosingChildren[tagNameLower(elementVerified)])
        return;

    // Scan immediate children to see if they contain unbalanced comment tags. If they do, those comment tags
    // must be intended to appear *after* that child, so move them there.
    var childNode = elementVerified.firstChild;
    if (childNode) {
        do {
            if (childNode.nodeType === 1) {
                var unbalancedTags = getUnbalancedChildTags(childNode);
                if (unbalancedTags) {
                    // Fix up the DOM by moving the unbalanced tags to where they most likely were intended to be placed - *after* the child
                    var nodeToInsertBefore = childNode.nextSibling;
                    for (var i = 0; i < unbalancedTags.length; i++) {
                        if (nodeToInsertBefore)
                            elementVerified.insertBefore(unbalancedTags[i], nodeToInsertBefore);
                        else
                            elementVerified.appendChild(unbalancedTags[i]);
                    }
                }
            }
        } while (childNode = childNode.nextSibling);
    }
}


var virtualElements = Object.freeze({
	startCommentRegex: startCommentRegex,
	endCommentRegex: endCommentRegex,
	isStartComment: isStartComment,
	isEndComment: isEndComment,
	getVirtualChildren: getVirtualChildren,
	allowedBindings: allowedBindings,
	hasBindingValue: hasBindingValue,
	childNodes: childNodes,
	emptyNode: emptyNode,
	setDomNodeChildren: setDomNodeChildren$1,
	prepend: prepend,
	insertAfter: insertAfter,
	firstChild: firstChild,
	lastChild: lastChild,
	nextSibling: nextSibling,
	previousSibling: previousSibling,
	virtualNodeBindingValue: virtualNodeBindingValue,
	normaliseVirtualElementDomStructure: normaliseVirtualElementDomStructure
});

//
// DOM manipulation
//
/* eslint no-empty: 0 */
function moveCleanedNodesToContainerElement(nodes) {
    // Ensure it's a real array, as we're about to reparent the nodes and
    // we don't want the underlying collection to change while we're doing that.
    var nodesArray = makeArray(nodes);
    var templateDocument = (nodesArray[0] && nodesArray[0].ownerDocument) || document;

    var container = templateDocument.createElement('div');
    for (var i = 0, j = nodesArray.length; i < j; i++) {
        container.appendChild(cleanNode(nodesArray[i]));
    }
    return container;
}

function cloneNodes (nodesArray, shouldCleanNodes) {
    for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
        var clonedNode = nodesArray[i].cloneNode(true);
        newNodesArray.push(shouldCleanNodes ? cleanNode(clonedNode) : clonedNode);
    }
    return newNodesArray;
}

function setDomNodeChildren (domNode, childNodes$$1) {
    emptyDomNode(domNode);
    if (childNodes$$1) {
        for (var i = 0, j = childNodes$$1.length; i < j; i++)
            domNode.appendChild(childNodes$$1[i]);
    }
}

function replaceDomNodes (nodeToReplaceOrNodeArray, newNodesArray) {
    var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
    if (nodesToReplaceArray.length > 0) {
        var insertionPoint = nodesToReplaceArray[0];
        var parent = insertionPoint.parentNode;
        for (var i = 0, j = newNodesArray.length; i < j; i++)
            parent.insertBefore(newNodesArray[i], insertionPoint);
        for (i = 0, j = nodesToReplaceArray.length; i < j; i++) {
            removeNode(nodesToReplaceArray[i]);
        }
    }
}

function setElementName(element, name) {
    element.name = name;

    // Workaround IE 6/7 issue
    // - https://github.com/SteveSanderson/knockout/issues/197
    // - http://www.matts411.com/post/setting_the_name_attribute_in_ie_dom/
    if (ieVersion <= 7) {
        try {
            element.mergeAttributes(document.createElement("<input name='" + element.name + "'/>"), false);
        }
        catch(e) {} // For IE9 with doc mode "IE9 Standards" and browser mode "IE9 Compatibility View"
    }
}

function setTextContent(element, textContent) {
    var value = typeof textContent === 'function' ? textContent() : textContent;
    if ((value === null) || (value === undefined))
        value = "";

    // We need there to be exactly one child: a text node.
    // If there are no children, more than one, or if it's not a text node,
    // we'll clear everything and create a single text node.
    var innerTextNode = firstChild(element);
    if (!innerTextNode || innerTextNode.nodeType != 3 || nextSibling(innerTextNode)) {
        setDomNodeChildren$1(element, [element.ownerDocument.createTextNode(value)]);
    } else {
        innerTextNode.data = value;
    }

    forceRefresh(element);
}

function emptyDomNode (domNode) {
    while (domNode.firstChild) {
        removeNode(domNode.firstChild);
    }
}

//
// HTML-based manipulation
//
var none = [0, "", ""];
var table = [1, "<table>", "</table>"];
var tbody = [2, "<table><tbody>", "</tbody></table>"];
var colgroup = [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"];
var tr = [3, "<table><tbody><tr>", "</tr></tbody></table>"];
var select = [1, "<select multiple='multiple'>", "</select>"];
var fieldset = [1, "<fieldset>", "</fieldset>"];
var map = [1, "<map>", "</map>"];
var object = [1, "<object>", "</object>"];
var lookup = {
        'area': map,
        'col': colgroup,
        'colgroup': table,
        'caption': table,
        'legend': fieldset,
        'thead': table,
        'tbody': table,
        'tfoot': table,
        'tr': tbody,
        'td': tr,
        'th': tr,
        'option': select,
        'optgroup': select,
        'param': object
    };
var supportsTemplateTag = 'content' in document.createElement('template');


function getWrap(tags) {
    var m = tags.match(/^<([a-z]+)[ >]/);
    return (m && lookup[m[1]]) || none;
}


function simpleHtmlParse(html, documentContext) {
    documentContext || (documentContext = document);
    var windowContext = documentContext['parentWindow'] || documentContext['defaultView'] || window;

    // Based on jQuery's "clean" function, but only accounting for table-related elements.
    // If you have referenced jQuery, this won't be used anyway - KO will use jQuery's "clean" function directly

    // Note that there's still an issue in IE < 9 whereby it will discard comment nodes that are the first child of
    // a descendant node. For example: "<div><!-- mycomment -->abc</div>" will get parsed as "<div>abc</div>"
    // This won't affect anyone who has referenced jQuery, and there's always the workaround of inserting a dummy node
    // (possibly a text node) in front of the comment. So, KO does not attempt to workaround this IE issue automatically at present.

    // Trim whitespace, otherwise indexOf won't work as expected
    var tags = stringTrim(html).toLowerCase(), div = documentContext.createElement("div"),
        wrap = getWrap(tags),
        depth = wrap[0];

    // Go to html and back, then peel off extra wrappers
    // Note that we always prefix with some dummy text, because otherwise, IE<9 will strip out leading comment nodes in descendants. Total madness.
    var markup = "ignored<div>" + wrap[1] + html + wrap[2] + "</div>";
    if (typeof windowContext['innerShiv'] == "function") {
        // Note that innerShiv is deprecated in favour of html5shiv. We should consider adding
        // support for html5shiv (except if no explicit support is needed, e.g., if html5shiv
        // somehow shims the native APIs so it just works anyway)
        div.appendChild(windowContext['innerShiv'](markup));
    } else {
        div.innerHTML = markup;
    }

    // Move to the right depth
    while (depth--)
        div = div.lastChild;

    return makeArray(div.lastChild.childNodes);
}


function templateHtmlParse(html, documentContext) {
    if (!documentContext) { documentContext = document; }
    var template = documentContext.createElement('template');
    template.innerHTML = html;
    return makeArray(template.content.childNodes);
}


function jQueryHtmlParse(html, documentContext) {
    // jQuery's "parseHTML" function was introduced in jQuery 1.8.0 and is a documented public API.
    if (jQueryInstance.parseHTML) {
        return jQueryInstance.parseHTML(html, documentContext) || []; // Ensure we always return an array and never null
    } else {
        // For jQuery < 1.8.0, we fall back on the undocumented internal "clean" function.
        var elems = jQueryInstance.clean([html], documentContext);

        // As of jQuery 1.7.1, jQuery parses the HTML by appending it to some dummy parent nodes held in an in-memory document fragment.
        // Unfortunately, it never clears the dummy parent nodes from the document fragment, so it leaks memory over time.
        // Fix this by finding the top-most dummy parent element, and detaching it from its owner fragment.
        if (elems && elems[0]) {
            // Find the top-most parent element that's a direct child of a document fragment
            var elem = elems[0];
            while (elem.parentNode && elem.parentNode.nodeType !== 11 /* i.e., DocumentFragment */)
                elem = elem.parentNode;
            // ... then detach it
            if (elem.parentNode)
                elem.parentNode.removeChild(elem);
        }

        return elems;
    }
}


/**
 * parseHtmlFragment converts a string into an array of DOM Nodes.
 * If supported, it uses <template>-tag parsing, falling back on
 * jQuery parsing (if jQuery is present), and finally on a
 * straightforward parser.
 *
 * @param  {string} html            To be parsed.
 * @param  {Object} documentContext That owns the executing code.
 * @return {[DOMNode]}              Parsed DOM Nodes
 */
function parseHtmlFragment(html, documentContext) {
    // Prefer <template>-tag based HTML parsing.
    return supportsTemplateTag ? templateHtmlParse(html, documentContext) :

        // Benefit from jQuery's on old browsers, where possible
        // NOTE: jQuery's HTML parsing fails on element names like tr-*.
        // See: https://github.com/jquery/jquery/pull/1988
        (jQueryInstance ? jQueryHtmlParse(html, documentContext) :

        // ... otherwise, this simple logic will do in most common cases.
        simpleHtmlParse(html, documentContext));
}


/**
  * setHtml empties the node's contents, unwraps the HTML, and
  * sets the node's HTML using jQuery.html or parseHtmlFragment
  *
  * @param {DOMNode} node Node in which HTML needs to be set
  * @param {DOMNode} html HTML to be inserted in node
  * @returns undefined
  */
function setHtml(node, html) {
    emptyDomNode(node);

    // There's few cases where we would want to display a stringified
    // function, so we unwrap it.
    if (typeof html === 'function') {
        html = html();
    }

    if ((html !== null) && (html !== undefined)) {
        if (typeof html !== 'string')
            html = html.toString();

        // If the browser supports <template> tags, prefer that, as
        // it obviates all the complex workarounds of jQuery.
        //
        // However, jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
        // for example <tr> elements which are not normally allowed to exist on their own.
        // If you've referenced jQuery (and template tags are not supported) we'll use that rather than duplicating its code.
        if (jQueryInstance && !supportsTemplateTag) {
            jQueryInstance(node).html(html);
        } else {
            // ... otherwise, use KO's own parsing logic.
            var parsedNodes = parseHtmlFragment(html, node.ownerDocument);

            if (node.nodeType === 8) {
                if (html === null) {
                    emptyNode(node);
                } else {
                    setDomNodeChildren$1(node, parsedNodes);
                }
            } else {
                for (var i = 0; i < parsedNodes.length; i++)
                    node.appendChild(parsedNodes[i]);
            }
        }
    }
}

//
// Memoization
//
var memos = {};

function randomMax8HexChars() {
    return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
}

function generateRandomId() {
    return randomMax8HexChars() + randomMax8HexChars();
}

function findMemoNodes(rootNode, appendToArray) {
    if (!rootNode)
        return;
    if (rootNode.nodeType == 8) {
        var memoId = parseMemoText(rootNode.nodeValue);
        if (memoId != null)
            appendToArray.push({ domNode: rootNode, memoId: memoId });
    } else if (rootNode.nodeType == 1) {
        for (var i = 0, childNodes = rootNode.childNodes, j = childNodes.length; i < j; i++)
            findMemoNodes(childNodes[i], appendToArray);
    }
}


function memoize(callback) {
    if (typeof callback != "function")
        throw new Error("You can only pass a function to memoization.memoize()");
    var memoId = generateRandomId();
    memos[memoId] = callback;
    return "<!--[ko_memo:" + memoId + "]-->";
}

function unmemoize(memoId, callbackParams) {
    var callback = memos[memoId];
    if (callback === undefined)
        throw new Error("Couldn't find any memo with ID " + memoId + ". Perhaps it's already been unmemoized.");
    try {
        callback.apply(null, callbackParams || []);
        return true;
    }
    finally { delete memos[memoId]; }
}

function unmemoizeDomNodeAndDescendants(domNode, extraCallbackParamsArray) {
    var memos = [];
    findMemoNodes(domNode, memos);
    for (var i = 0, j = memos.length; i < j; i++) {
        var node = memos[i].domNode;
        var combinedParams = [node];
        if (extraCallbackParamsArray)
            arrayPushAll(combinedParams, extraCallbackParamsArray);
        unmemoize(memos[i].memoId, combinedParams);
        node.nodeValue = ""; // Neuter this node so we don't try to unmemoize it again
        if (node.parentNode)
            node.parentNode.removeChild(node); // If possible, erase it totally (not always possible - someone else might just hold a reference to it then call unmemoizeDomNodeAndDescendants again)
    }
}

function parseMemoText(memoText) {
    var match = memoText.match(/^\[ko_memo\:(.*?)\]$/);
    return match ? match[1] : null;
}


var memoization = Object.freeze({
	memoize: memoize,
	unmemoize: unmemoize,
	unmemoizeDomNodeAndDescendants: unmemoizeDomNodeAndDescendants,
	parseMemoText: parseMemoText
});

//
//  Tasks Micro-scheduler
//  ===
//
/* eslint no-cond-assign: 0 */
var taskQueue = [];
var taskQueueLength = 0;
var nextHandle = 1;
var nextIndexToProcess = 0;

if (window.MutationObserver && !(window.navigator && window.navigator.standalone)) {
    // Chrome 27+, Firefox 14+, IE 11+, Opera 15+, Safari 6.1+
    // From https://github.com/petkaantonov/bluebird * Copyright (c) 2014 Petka Antonov * License: MIT
    options.taskScheduler = (function (callback) {
        var div = document.createElement("div");
        new MutationObserver(callback).observe(div, {attributes: true});
        return function () { div.classList.toggle("foo"); };
    })(scheduledProcess);
} else if (document && "onreadystatechange" in document.createElement("script")) {
    // IE 6-10
    // From https://github.com/YuzuJS/setImmediate * Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola * License: MIT
    options.taskScheduler = function (callback) {
        var script = document.createElement("script");
        script.onreadystatechange = function () {
            script.onreadystatechange = null;
            document.documentElement.removeChild(script);
            script = null;
            callback();
        };
        document.documentElement.appendChild(script);
    };
} else {
    options.taskScheduler = function (callback) {
        setTimeout(callback, 0);
    };
}

function processTasks() {
    if (taskQueueLength) {
        // Each mark represents the end of a logical group of tasks and the number of these groups is
        // limited to prevent unchecked recursion.
        var mark = taskQueueLength, countMarks = 0;

        // nextIndexToProcess keeps track of where we are in the queue; processTasks can be called recursively without issue
        for (var task; nextIndexToProcess < taskQueueLength; ) {
            if (task = taskQueue[nextIndexToProcess++]) {
                if (nextIndexToProcess > mark) {
                    if (++countMarks >= 5000) {
                        nextIndexToProcess = taskQueueLength;   // skip all tasks remaining in the queue since any of them could be causing the recursion
                        deferError(Error("'Too much recursion' after processing " + countMarks + " task groups."));
                        break;
                    }
                    mark = taskQueueLength;
                }
                try {
                    task();
                } catch (ex) {
                    deferError(ex);
                }
            }
        }
    }
}

function scheduledProcess() {
    processTasks();

    // Reset the queue
    nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
}

function scheduleTaskProcessing() {
    options.taskScheduler(scheduledProcess);
}


function schedule(func) {
    if (!taskQueueLength) {
        scheduleTaskProcessing();
    }

    taskQueue[taskQueueLength++] = func;
    return nextHandle++;
}

function cancel(handle) {
    var index = handle - (nextHandle - taskQueueLength);
    if (index >= nextIndexToProcess && index < taskQueueLength) {
        taskQueue[index] = null;
    }
}

// For testing only: reset the queue and return the previous queue length
function resetForTesting() {
    var length = taskQueueLength - nextIndexToProcess;
    nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
    return length;
}




var tasks = Object.freeze({
	schedule: schedule,
	cancel: cancel,
	resetForTesting: resetForTesting,
	runEarly: processTasks
});

/*
  tko.util
  ===


*/

// Sub-Modules;



var utils = Object.freeze({
	tasks: tasks,
	virtualElements: virtualElements,
	domData: data,
	memoization: memoization,
	jQuerySetInstance: jQuerySetInstance,
	options: options,
	arrayForEach: arrayForEach,
	arrayIndexOf: arrayIndexOf,
	arrayFirst: arrayFirst,
	arrayRemoveItem: arrayRemoveItem,
	arrayGetDistinctValues: arrayGetDistinctValues,
	arrayMap: arrayMap,
	arrayFilter: arrayFilter,
	arrayPushAll: arrayPushAll,
	addOrRemoveItem: addOrRemoveItem,
	makeArray: makeArray,
	range: range,
	findMovesInArrayComparison: findMovesInArrayComparison,
	compareArrays: compareArrays,
	throttle: throttle,
	debounce: debounce,
	catchFunctionErrors: catchFunctionErrors,
	deferError: deferError,
	safeSetTimeout: safeSetTimeout,
	ieVersion: ieVersion,
	isIe6: isIe6,
	isIe7: isIe7,
	extend: extend,
	objectForEach: objectForEach,
	objectMap: objectMap,
	getObjectOwnProperty: getObjectOwnProperty,
	clonePlainObjectDeep: clonePlainObjectDeep,
	canSetPrototype: canSetPrototype,
	setPrototypeOf: setPrototypeOf,
	setPrototypeOfOrExtend: setPrototypeOfOrExtend,
	hasPrototype: hasPrototype,
	stringTrim: stringTrim,
	stringStartsWith: stringStartsWith,
	parseJson: parseJson,
	stringifyJson: stringifyJson,
	useSymbols: useSymbols,
	createSymbolOrString: createSymbolOrString,
	toggleDomNodeCssClass: toggleDomNodeCssClass,
	registerEventHandler: registerEventHandler,
	triggerEvent: triggerEvent,
	domNodeIsContainedBy: domNodeIsContainedBy,
	domNodeIsAttachedToDocument: domNodeIsAttachedToDocument,
	anyDomNodeIsAttachedToDocument: anyDomNodeIsAttachedToDocument,
	tagNameLower: tagNameLower,
	isDomElement: isDomElement,
	isDocumentFragment: isDocumentFragment,
	moveCleanedNodesToContainerElement: moveCleanedNodesToContainerElement,
	cloneNodes: cloneNodes,
	setDomNodeChildren: setDomNodeChildren,
	replaceDomNodes: replaceDomNodes,
	setElementName: setElementName,
	setTextContent: setTextContent,
	emptyDomNode: emptyDomNode,
	fixUpContinuousNodeArray: fixUpContinuousNodeArray,
	setOptionNodeSelectionState: setOptionNodeSelectionState,
	forceRefresh: forceRefresh,
	ensureSelectElementIsRenderedCorrectly: ensureSelectElementIsRenderedCorrectly,
	parseHtmlFragment: parseHtmlFragment,
	setHtml: setHtml,
	addDisposeCallback: addDisposeCallback,
	removeDisposeCallback: removeDisposeCallback,
	cleanNode: cleanNode,
	removeNode: removeNode,
	otherNodeCleanerFunctions: otherNodeCleanerFunctions,
	cleanjQueryData: cleanjQueryData
});

//
//  Defer Updates
//  ===
//
function deferUpdates(target) {
    if (!target._deferUpdates) {
        target._deferUpdates = true;
        target.limit(function (callback) {
            var handle;
            return function () {
                cancel(handle);
                handle = schedule(callback);
                target.notifySubscribers(undefined, 'dirty');
            };
        });
    }
}

//
// Observable extenders
// ---
//
var primitiveTypes = {
  'undefined': 1, 'boolean': 1, 'number': 1, 'string': 1
};

function valuesArePrimitiveAndEqual (a, b) {
  var oldValueIsPrimitive = (a === null) || (typeof (a) in primitiveTypes);
  return oldValueIsPrimitive ? (a === b) : false
}

function applyExtenders (requestedExtenders) {
  var target = this;
  if (requestedExtenders) {
    objectForEach(requestedExtenders, function (key, value) {
      var extenderHandler = extenders[key];
      if (typeof extenderHandler === 'function') {
        target = extenderHandler(target, value) || target;
      } else {
        options.onError(new Error('Extender not found: ' + key));
      }
    });
  }
  return target
}

/*
                --- DEFAULT EXTENDERS ---
 */

// Change when notifications are published.
function notify (target, notifyWhen) {
  target.equalityComparer = notifyWhen == 'always' ?
        null :  // null equalityComparer means to always notify
        valuesArePrimitiveAndEqual;
}

function deferred (target, option) {
  if (option !== true) {
    throw new Error('The \'deferred\' extender only accepts the value \'true\', because it is not supported to turn deferral off once enabled.')
  }
  deferUpdates(target);
}

function rateLimit (target, options$$1) {
  var timeout, method, limitFunction;

  if (typeof options$$1 === 'number') {
    timeout = options$$1;
  } else {
    timeout = options$$1.timeout;
    method = options$$1.method;
  }

    // rateLimit supersedes deferred updates
  target._deferUpdates = false;

  limitFunction = method == 'notifyWhenChangesStop' ? debounce : throttle;

  target.limit(function (callback) {
    return limitFunction(callback, timeout)
  });
}

var extenders = {
  notify: notify,
  deferred: deferred,
  rateLimit: rateLimit
};

/* eslint no-cond-assign: 0 */
function subscription (target, callback, disposeCallback) {
  this._target = target;
  this.callback = callback;
  this.disposeCallback = disposeCallback;
  this.isDisposed = false;
}

subscription.prototype.dispose = function () {
  this.isDisposed = true;
  this.disposeCallback();
};

function subscribable () {
  setPrototypeOfOrExtend(this, ko_subscribable_fn);
  ko_subscribable_fn.init(this);
}

var defaultEvent = 'change';

var ko_subscribable_fn = {
  init (instance) {
    instance._subscriptions = {};
    instance._versionNumber = 1;
  },

  subscribe (callback, callbackTarget, event) {
    var self = this;

    event = event || defaultEvent;
    var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

    var subscriptionInstance = new subscription(self, boundCallback, function () {
      arrayRemoveItem(self._subscriptions[event], subscriptionInstance);
      if (self.afterSubscriptionRemove) {
        self.afterSubscriptionRemove(event);
      }
    });

    if (self.beforeSubscriptionAdd) {
      self.beforeSubscriptionAdd(event);
    }

    if (!self._subscriptions[event]) {
      self._subscriptions[event] = [];
    }
    self._subscriptions[event].push(subscriptionInstance);

    return subscriptionInstance
  },

  notifySubscribers (valueToNotify, event) {
    event = event || defaultEvent;
    if (event === defaultEvent) {
      this.updateVersion();
    }
    if (this.hasSubscriptionsForEvent(event)) {
      try {
        begin(); // Begin suppressing dependency detection (by setting the top frame to undefined)
        for (var a = this._subscriptions[event].slice(0), i = 0, subscriptionInstance; subscriptionInstance = a[i]; ++i) {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
          if (!subscriptionInstance.isDisposed) {
            subscriptionInstance.callback(valueToNotify);
          }
        }
      } finally {
        end(); // End suppressing dependency detection
      }
    }
  },

  getVersion () {
    return this._versionNumber
  },

  hasChanged (versionToCheck) {
    return this.getVersion() !== versionToCheck
  },

  updateVersion () {
    ++this._versionNumber;
  },

  hasSubscriptionsForEvent (event) {
    return this._subscriptions[event] && this._subscriptions[event].length
  },

  getSubscriptionsCount (event) {
    if (event) {
      return this._subscriptions[event] && this._subscriptions[event].length || 0
    } else {
      var total = 0;
      objectForEach(this._subscriptions, function (eventName, subscriptions) {
        if (eventName !== 'dirty') {
          total += subscriptions.length;
        }
      });
      return total
    }
  },

  isDifferent (oldValue, newValue) {
    return !this.equalityComparer ||
               !this.equalityComparer(oldValue, newValue)
  },

  once (cb) {
    const subs = this.subscribe((nv) => {
      subs.dispose();
      cb(nv);
    });
  },

  when (test, returnValue) {
    const current = this.peek();
    const givenRv = arguments.length > 1;
    const testFn = typeof test === 'function' ? test : v => v === test;
    if (testFn(current)) {
      return options.Promise.resolve(givenRv ? returnValue : current)
    }
    return new options.Promise((resolve, reject) => {
      const subs = this.subscribe(newValue => {
        if (testFn(newValue)) {
          subs.dispose();
          resolve(givenRv ? returnValue : newValue);
        }
      });
    })
  },

  yet (test, ...args) {
    const testFn = typeof test === 'function' ? test : v => v === test;
    const negated = v => !testFn(v);
    return this.when(negated, ...args)
  },

  next () { return new Promise(resolve => this.once(resolve)) },

  extend: applyExtenders
};

// For browsers that support proto assignment, we overwrite the prototype of each
// observable instance. Since observables are functions, we need Function.prototype
// to still be in the prototype chain.
if (canSetPrototype) {
  setPrototypeOf(ko_subscribable_fn, Function.prototype);
}

subscribable.fn = ko_subscribable_fn;

function isSubscribable (instance) {
  return instance != null && typeof instance.subscribe === 'function' && typeof instance.notifySubscribers === 'function'
}

//
// dependencyDetection
// ---
//
// In KO 3.x, dependencyDetection was also known as computedContext.
//
const outerFrames = [];
let currentFrame;
let lastId = 0;

// Return a unique ID that can be assigned to an observable for dependency tracking.
// Theoretically, you could eventually overflow the number storage size, resulting
// in duplicate IDs. But in JavaScript, the largest exact integral value is 2^53
// or 9,007,199,254,740,992. If you created 1,000,000 IDs per second, it would
// take over 285 years to reach that number.
// Reference http://blog.vjeux.com/2010/javascript/javascript-max_int-number-limits.html
function getId () {
  return ++lastId
}

function begin (options) {
  outerFrames.push(currentFrame);
  currentFrame = options;
}

function end () {
  currentFrame = outerFrames.pop();
}

function registerDependency (subscribable$$1) {
  if (currentFrame) {
    if (!isSubscribable(subscribable$$1)) { throw new Error('Only subscribable things can act as dependencies') }
    currentFrame.callback.call(currentFrame.callbackTarget, subscribable$$1, subscribable$$1._id || (subscribable$$1._id = getId()));
  }
}

function ignore (callback, callbackTarget, callbackArgs) {
  try {
    begin();
    return callback.apply(callbackTarget, callbackArgs || [])
  } finally {
    end();
  }
}

function getDependenciesCount () {
  if (currentFrame) { return currentFrame.computed.getDependenciesCount() }
}

function isInitial () {
  if (currentFrame) { return currentFrame.isInitial }
}




var dependencyDetection = Object.freeze({
	begin: begin,
	end: end,
	registerDependency: registerDependency,
	ignore: ignore,
	getDependenciesCount: getDependenciesCount,
	isInitial: isInitial,
	ignoreDependencies: ignore
});

//
//  Observable values
//  ---
//
var observableLatestValue = createSymbolOrString('_latestValue');

function observable (initialValue) {
  function Observable () {
    if (arguments.length > 0) {
            // Write
            // Ignore writes if the value hasn't changed
      if (Observable.isDifferent(Observable[observableLatestValue], arguments[0])) {
        Observable.valueWillMutate();
        Observable[observableLatestValue] = arguments[0];
        Observable.valueHasMutated();
      }
      return this // Permits chained assignments
    } else {
            // Read
      registerDependency(Observable); // The caller only needs to be notified of changes if they did a "read" operation
      return Observable[observableLatestValue]
    }
  }

  Observable[observableLatestValue] = initialValue;

    // Inherit from 'subscribable'
  if (!canSetPrototype) {
        // 'subscribable' won't be on the prototype chain unless we put it there directly
    extend(Observable, subscribable.fn);
  }
  subscribable.fn.init(Observable);

    // Inherit from 'observable'
  setPrototypeOfOrExtend(Observable, observable.fn);

  if (options.deferUpdates) {
    deferUpdates(Observable);
  }

  return Observable
}

// Define prototype for observables
observable.fn = {
  equalityComparer: valuesArePrimitiveAndEqual,
  peek () { return this[observableLatestValue] },
  valueHasMutated () { this.notifySubscribers(this[observableLatestValue]); },
  valueWillMutate () {
    this.notifySubscribers(this[observableLatestValue], 'beforeChange');
  },
  then (res, rej) { try { res(this()); } catch (e) { rej(e); } },
};

// Moved out of "limit" to avoid the extra closure
function limitNotifySubscribers (value, event) {
  if (!event || event === defaultEvent) {
    this._limitChange(value);
  } else if (event === 'beforeChange') {
    this._limitBeforeChange(value);
  } else {
    this._origNotifySubscribers(value, event);
  }
}

// Add `limit` function to the subscribable prototype
subscribable.fn.limit = function limit (limitFunction) {
  var self = this;
  var selfIsObservable = isObservable(self);
  var beforeChange = 'beforeChange';
  var ignoreBeforeChange, previousValue, pendingValue;

  if (!self._origNotifySubscribers) {
    self._origNotifySubscribers = self.notifySubscribers;
    self.notifySubscribers = limitNotifySubscribers;
  }

  var finish = limitFunction(function () {
    self._notificationIsPending = false;

        // If an observable provided a reference to itself, access it to get the latest value.
        // This allows computed observables to delay calculating their value until needed.
    if (selfIsObservable && pendingValue === self) {
      pendingValue = self();
    }
    ignoreBeforeChange = false;
    if (self.isDifferent(previousValue, pendingValue)) {
      self._origNotifySubscribers(previousValue = pendingValue);
    }
  });

  self._limitChange = function (value) {
    self._notificationIsPending = ignoreBeforeChange = true;
    pendingValue = value;
    finish();
  };
  self._limitBeforeChange = function (value) {
    if (!ignoreBeforeChange) {
      previousValue = value;
      self._origNotifySubscribers(value, beforeChange);
    }
  };
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the observable constructor
if (canSetPrototype) {
  setPrototypeOf(observable.fn, subscribable.fn);
}

var protoProperty$1 = observable.protoProperty = options.protoProperty;
observable.fn[protoProperty$1] = observable;

function isObservable (instance) {
  return hasPrototype(instance, observable)
}

function unwrap (value) {
  return isObservable(value) ? value() : value
}

function peek (value) {
  return isObservable(value) ? value.peek() : value
}

function isWriteableObservable (instance) {
    // Observable
  if ((typeof instance === 'function') && instance[protoProperty$1] === observable) {
    return true
  }
    // Writeable dependent observable
  if ((typeof instance === 'function') /* && (instance[protoProperty] === ko.dependentObservable) */ && (instance.hasWriteFunction)) {
    return true
  }
    // Anything else
  return false
}

//
// Observable Array - Change Tracking Extender
// ---
//
/* eslint no-fallthrough: 0*/

var arrayChangeEventName = 'arrayChange';


function trackArrayChanges(target, options$$1) {
    // Use the provided options--each call to trackArrayChanges overwrites the previously set options
    target.compareArrayOptions = {};
    if (options$$1 && typeof options$$1 == "object") {
        extend(target.compareArrayOptions, options$$1);
    }
    target.compareArrayOptions.sparse = true;

    // Only modify the target observable once
    if (target.cacheDiffForKnownOperation) {
        return;
    }
    var trackingChanges = false,
        cachedDiff = null,
        arrayChangeSubscription,
        pendingNotifications = 0,
        underlyingBeforeSubscriptionAddFunction = target.beforeSubscriptionAdd,
        underlyingAfterSubscriptionRemoveFunction = target.afterSubscriptionRemove;

    // Watch "subscribe" calls, and for array change events, ensure change tracking is enabled
    target.beforeSubscriptionAdd = function (event) {
        if (underlyingBeforeSubscriptionAddFunction)
            underlyingBeforeSubscriptionAddFunction.call(target, event);
        if (event === arrayChangeEventName) {
            trackChanges();
        }
    };

    // Watch "dispose" calls, and for array change events, ensure change tracking is disabled when all are disposed
    target.afterSubscriptionRemove = function (event) {
        if (underlyingAfterSubscriptionRemoveFunction)
            underlyingAfterSubscriptionRemoveFunction.call(target, event);
        if (event === arrayChangeEventName && !target.hasSubscriptionsForEvent(arrayChangeEventName)) {
            if (arrayChangeSubscription) {
                arrayChangeSubscription.dispose();
            }
            arrayChangeSubscription = null;
            trackingChanges = false;
        }
    };

    function trackChanges() {
        // Calling 'trackChanges' multiple times is the same as calling it once
        if (trackingChanges) {
            return;
        }

        trackingChanges = true;

        // Intercept "notifySubscribers" to track how many times it was called.
        var underlyingNotifySubscribersFunction = target['notifySubscribers'];
        target['notifySubscribers'] = function(valueToNotify, event) {
            if (!event || event === defaultEvent) {
                ++pendingNotifications;
            }
            return underlyingNotifySubscribersFunction.apply(this, arguments);
        };

        // Each time the array changes value, capture a clone so that on the next
        // change it's possible to produce a diff
        var previousContents = [].concat(target.peek() || []);
        cachedDiff = null;
        arrayChangeSubscription = target.subscribe(function(currentContents) {
            // Make a copy of the current contents and ensure it's an array
            currentContents = [].concat(currentContents || []);

            // Compute the diff and issue notifications, but only if someone is listening
            if (target.hasSubscriptionsForEvent(arrayChangeEventName)) {
                var changes = getChanges(previousContents, currentContents);
            }

            // Eliminate references to the old, removed items, so they can be GCed
            previousContents = currentContents;
            cachedDiff = null;
            pendingNotifications = 0;

            if (changes && changes.length) {
                target['notifySubscribers'](changes, arrayChangeEventName);
            }
        });
    }

    function getChanges(previousContents, currentContents) {
        // We try to re-use cached diffs.
        // The scenarios where pendingNotifications > 1 are when using rate-limiting or the Deferred Updates
        // plugin, which without this check would not be compatible with arrayChange notifications. Normally,
        // notifications are issued immediately so we wouldn't be queueing up more than one.
        if (!cachedDiff || pendingNotifications > 1) {
            cachedDiff = trackArrayChanges.compareArrays(previousContents, currentContents, target.compareArrayOptions);
        }

        return cachedDiff;
    }

    target.cacheDiffForKnownOperation = function(rawArray, operationName, args) {
        var index, argsIndex;
        // Only run if we're currently tracking changes for this observable array
        // and there aren't any pending deferred notifications.
        if (!trackingChanges || pendingNotifications) {
            return;
        }
        var diff = [],
            arrayLength = rawArray.length,
            argsLength = args.length,
            offset = 0;

        function pushDiff(status, value, index) {
            return diff[diff.length] = { 'status': status, 'value': value, 'index': index };
        }
        switch (operationName) {
        case 'push':
            offset = arrayLength;
        case 'unshift':
            for (index = 0; index < argsLength; index++) {
                pushDiff('added', args[index], offset + index);
            }
            break;

        case 'pop':
            offset = arrayLength - 1;
        case 'shift':
            if (arrayLength) {
                pushDiff('deleted', rawArray[offset], offset);
            }
            break;

        case 'splice':
            // Negative start index means 'from end of array'. After that we clamp to [0...arrayLength].
            // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
            var startIndex = Math.min(Math.max(0, args[0] < 0 ? arrayLength + args[0] : args[0]), arrayLength),
                endDeleteIndex = argsLength === 1 ? arrayLength : Math.min(startIndex + (args[1] || 0), arrayLength),
                endAddIndex = startIndex + argsLength - 2,
                endIndex = Math.max(endDeleteIndex, endAddIndex),
                additions = [], deletions = [];
            for (index = startIndex, argsIndex = 2; index < endIndex; ++index, ++argsIndex) {
                if (index < endDeleteIndex)
                    deletions.push(pushDiff('deleted', rawArray[index], index));
                if (index < endAddIndex)
                    additions.push(pushDiff('added', args[argsIndex], index));
            }
            findMovesInArrayComparison(deletions, additions);
            break;

        default:
            return;
        }
        cachedDiff = diff;
    };
}


// Expose compareArrays for testing.
trackArrayChanges.compareArrays = compareArrays;


// Add the trackArrayChanges extender so we can use
// obs.extend({ trackArrayChanges: true })
extenders.trackArrayChanges = trackArrayChanges;

//
// Observable Arrays
// ===
//
function observableArray (initialValues) {
  initialValues = initialValues || [];

  if (typeof initialValues !== 'object' || !('length' in initialValues)) { throw new Error('The argument passed when initializing an observable array must be an array, or null, or undefined.') }

  var result = observable(initialValues);
  setPrototypeOfOrExtend(result, observableArray.fn);
  trackArrayChanges(result);
        // ^== result.extend({ trackArrayChanges: true })
  return result
}

observableArray.fn = {
  remove: function (valueOrPredicate) {
    var underlyingArray = this.peek();
    var removedValues = [];
    var predicate = typeof valueOrPredicate === 'function' && !isObservable(valueOrPredicate) ? valueOrPredicate : function (value) { return value === valueOrPredicate };
    for (var i = 0; i < underlyingArray.length; i++) {
      var value = underlyingArray[i];
      if (predicate(value)) {
        if (removedValues.length === 0) {
          this.valueWillMutate();
        }
        removedValues.push(value);
        underlyingArray.splice(i, 1);
        i--;
      }
    }
    if (removedValues.length) {
      this.valueHasMutated();
    }
    return removedValues
  },

  removeAll: function (arrayOfValues) {
        // If you passed zero args, we remove everything
    if (arrayOfValues === undefined) {
      var underlyingArray = this.peek();
      var allValues = underlyingArray.slice(0);
      this.valueWillMutate();
      underlyingArray.splice(0, underlyingArray.length);
      this.valueHasMutated();
      return allValues
    }
        // If you passed an arg, we interpret it as an array of entries to remove
    if (!arrayOfValues) {
      return []
    }
    return this['remove'](function (value) {
      return arrayIndexOf(arrayOfValues, value) >= 0
    })
  },

  destroy: function (valueOrPredicate) {
    var underlyingArray = this.peek();
    var predicate = typeof valueOrPredicate === 'function' && !isObservable(valueOrPredicate) ? valueOrPredicate : function (value) { return value === valueOrPredicate };
    this.valueWillMutate();
    for (var i = underlyingArray.length - 1; i >= 0; i--) {
      var value = underlyingArray[i];
      if (predicate(value)) {
        underlyingArray[i]['_destroy'] = true;
      }
    }
    this.valueHasMutated();
  },

  destroyAll: function (arrayOfValues) {
        // If you passed zero args, we destroy everything
    if (arrayOfValues === undefined) { return this.destroy(function () { return true }) }

        // If you passed an arg, we interpret it as an array of entries to destroy
    if (!arrayOfValues) {
      return []
    }
    return this.destroy(function (value) {
      return arrayIndexOf(arrayOfValues, value) >= 0
    })
  },

  indexOf: function (item) {
    var underlyingArray = this();
    return arrayIndexOf(underlyingArray, item)
  },

  replace: function (oldItem, newItem) {
    var index = this.indexOf(oldItem);
    if (index >= 0) {
      this.valueWillMutate();
      this.peek()[index] = newItem;
      this.valueHasMutated();
    }
  }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observableArray constructor
if (canSetPrototype) {
  setPrototypeOf(observableArray.fn, observable.fn);
}

// Populate ko.observableArray.fn with read/write functions from native arrays
// Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
// because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
arrayForEach(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function (methodName) {
  observableArray.fn[methodName] = function () {
        // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
        // (for consistency with mutating regular observables)
    var underlyingArray = this.peek();
    this.valueWillMutate();
    this.cacheDiffForKnownOperation(underlyingArray, methodName, arguments);
    var methodCallResult = underlyingArray[methodName].apply(underlyingArray, arguments);
    this.valueHasMutated();
        // The native sort and reverse methods return a reference to the array, but it makes more sense to return the observable array instead.
    return methodCallResult === underlyingArray ? this : methodCallResult
  };
});

// Populate ko.observableArray.fn with read-only functions from native arrays
arrayForEach(['slice'], function (methodName) {
  observableArray.fn[methodName] = function () {
    var underlyingArray = this();
    return underlyingArray[methodName].apply(underlyingArray, arguments)
  };
});

//
// Helpers
// ---
// toJS & toJSON
//
var maxNestedObservableDepth = 10; // Escape the (unlikely) pathalogical case where an observable's current value is itself (or similar reference cycle)

function toJS(rootObject) {
    if (arguments.length == 0)
        throw new Error("When calling ko.toJS, pass the object you want to convert.");

    // We just unwrap everything at every level in the object graph
    return mapJsObjectGraph(rootObject, function(valueToMap) {
        // Loop because an observable's value might in turn be another observable wrapper
        for (var i = 0; isObservable(valueToMap) && (i < maxNestedObservableDepth); i++)
            valueToMap = valueToMap();
        return valueToMap;
    });
}

function toJSON(rootObject, replacer, space) {     // replacer and space are optional
    var plainJavaScriptObject = toJS(rootObject);
    return stringifyJson(plainJavaScriptObject, replacer, space);
}

function mapJsObjectGraph(rootObject, mapInputCallback, visitedObjects) {
    visitedObjects = visitedObjects || new objectLookup();

    rootObject = mapInputCallback(rootObject);
    var canHaveProperties = (typeof rootObject == "object") && (rootObject !== null) && (rootObject !== undefined) && (!(rootObject instanceof RegExp)) && (!(rootObject instanceof Date)) && (!(rootObject instanceof String)) && (!(rootObject instanceof Number)) && (!(rootObject instanceof Boolean));
    if (!canHaveProperties)
        return rootObject;

    var outputProperties = rootObject instanceof Array ? [] : {};
    visitedObjects.save(rootObject, outputProperties);

    visitPropertiesOrArrayEntries(rootObject, function(indexer) {
        var propertyValue = mapInputCallback(rootObject[indexer]);

        switch (typeof propertyValue) {
        case "boolean":
        case "number":
        case "string":
        case "function":
            outputProperties[indexer] = propertyValue;
            break;
        case "object":
        case "undefined":
            var previouslyMappedValue = visitedObjects.get(propertyValue);
            outputProperties[indexer] = (previouslyMappedValue !== undefined)
                ? previouslyMappedValue
                : mapJsObjectGraph(propertyValue, mapInputCallback, visitedObjects);
            break;
        }
    });

    return outputProperties;
}

function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
    if (rootObject instanceof Array) {
        for (var i = 0; i < rootObject.length; i++)
            visitorCallback(i);

        // For arrays, also respect toJSON property for custom mappings (fixes #278)
        if (typeof rootObject['toJSON'] == 'function')
            visitorCallback('toJSON');
    } else {
        for (var propertyName in rootObject) {
            visitorCallback(propertyName);
        }
    }
}

function objectLookup() {
    this.keys = [];
    this.values = [];
}

objectLookup.prototype = {
    constructor: objectLookup,
    save: function(key, value) {
        var existingIndex = arrayIndexOf(this.keys, key);
        if (existingIndex >= 0)
            this.values[existingIndex] = value;
        else {
            this.keys.push(key);
            this.values.push(value);
        }
    },
    get: function(key) {
        var existingIndex = arrayIndexOf(this.keys, key);
        return (existingIndex >= 0) ? this.values[existingIndex] : undefined;
    }
};

//
// Observables.
// ---
//
// The following are added to the root `[t]ko` object.
//

//
// Computed Observable Values
//
// (before tko, `computed` was also known as `dependentObservable`)
//
var computedState = createSymbolOrString('_state');

function computed (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options$$1) {
  if (typeof evaluatorFunctionOrOptions === 'object') {
        // Single-parameter syntax - everything is on this "options" param
    options$$1 = evaluatorFunctionOrOptions;
  } else {
        // Multi-parameter syntax - construct the options according to the params passed
    options$$1 = options$$1 || {};
    if (evaluatorFunctionOrOptions) {
      options$$1.read = evaluatorFunctionOrOptions;
    }
  }
  if (typeof options$$1.read !== 'function') {
    throw Error('Pass a function that returns the value of the computed')
  }

  var writeFunction = options$$1.write;
  var state = {
    latestValue: undefined,
    isStale: true,
    isBeingEvaluated: false,
    suppressDisposalUntilDisposeWhenReturnsFalse: false,
    isDisposed: false,
    pure: false,
    isSleeping: false,
    readFunction: options$$1.read,
    evaluatorFunctionTarget: evaluatorFunctionTarget || options$$1.owner,
    disposeWhenNodeIsRemoved: options$$1.disposeWhenNodeIsRemoved || options$$1.disposeWhenNodeIsRemoved || null,
    disposeWhen: options$$1.disposeWhen || options$$1.disposeWhen,
    domNodeDisposalCallback: null,
    dependencyTracking: {},
    dependenciesCount: 0,
    evaluationTimeoutInstance: null
  };

  function computedObservable () {
    if (arguments.length > 0) {
      if (typeof writeFunction === 'function') {
                // Writing a value
        writeFunction.apply(state.evaluatorFunctionTarget, arguments);
      } else {
        throw new Error("Cannot write a value to a computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.")
      }
      return this // Permits chained assignments
    } else {
            // Reading the value
      registerDependency(computedObservable);
      if (state.isStale || (state.isSleeping && computedObservable.haveDependenciesChanged())) {
        computedObservable.evaluateImmediate();
      }
      return state.latestValue
    }
  }

  computedObservable[computedState] = state;
  computedObservable.hasWriteFunction = typeof writeFunction === 'function';

    // Inherit from 'subscribable'
  if (!canSetPrototype) {
        // 'subscribable' won't be on the prototype chain unless we put it there directly
    extend(computedObservable, subscribable.fn);
  }
  subscribable.fn.init(computedObservable);

    // Inherit from 'computed'
  setPrototypeOfOrExtend(computedObservable, computed.fn);

  if (options$$1.pure) {
    state.pure = true;
    state.isSleeping = true;     // Starts off sleeping; will awake on the first subscription
    extend(computedObservable, pureComputedOverrides);
  } else if (options$$1.deferEvaluation) {
    extend(computedObservable, deferEvaluationOverrides);
  }

  if (options.deferUpdates) {
    extenders.deferred(computedObservable, true);
  }

  if (options.debug) {
        // #1731 - Aid debugging by exposing the computed's options
    computedObservable._options = options$$1;
  }

  if (state.disposeWhenNodeIsRemoved) {
        // Since this computed is associated with a DOM node, and we don't want to dispose the computed
        // until the DOM node is *removed* from the document (as opposed to never having been in the document),
        // we'll prevent disposal until "disposeWhen" first returns false.
    state.suppressDisposalUntilDisposeWhenReturnsFalse = true;

        // disposeWhenNodeIsRemoved: true can be used to opt into the "only dispose after first false result"
        // behaviour even if there's no specific node to watch. In that case, clear the option so we don't try
        // to watch for a non-node's disposal. This technique is intended for KO's internal use only and shouldn't
        // be documented or used by application code, as it's likely to change in a future version of KO.
    if (!state.disposeWhenNodeIsRemoved.nodeType) {
      state.disposeWhenNodeIsRemoved = null;
    }
  }

    // Evaluate, unless sleeping or deferEvaluation is true
  if (!state.isSleeping && !options$$1.deferEvaluation) {
    computedObservable.evaluateImmediate();
  }

    // Attach a DOM node disposal callback so that the computed will be proactively disposed as soon as the node is
    // removed using ko.removeNode. But skip if isActive is false (there will never be any dependencies to dispose).
  if (state.disposeWhenNodeIsRemoved && computedObservable.isActive()) {
    addDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback = function () {
      computedObservable.dispose();
    });
  }

  return computedObservable
}

// Utility function that disposes a given dependencyTracking entry
function computedDisposeDependencyCallback (id, entryToDispose) {
  if (entryToDispose !== null && entryToDispose.dispose) {
    entryToDispose.dispose();
  }
}

// This function gets called each time a dependency is detected while evaluating a computed.
// It's factored out as a shared function to avoid creating unnecessary function instances during evaluation.
function computedBeginDependencyDetectionCallback (subscribable$$1, id) {
  var computedObservable = this.computedObservable,
    state = computedObservable[computedState];
  if (!state.isDisposed) {
    if (this.disposalCount && this.disposalCandidates[id]) {
            // Don't want to dispose this subscription, as it's still being used
      computedObservable.addDependencyTracking(id, subscribable$$1, this.disposalCandidates[id]);
      this.disposalCandidates[id] = null; // No need to actually delete the property - disposalCandidates is a transient object anyway
      --this.disposalCount;
    } else if (!state.dependencyTracking[id]) {
            // Brand new subscription - add it
      computedObservable.addDependencyTracking(id, subscribable$$1, state.isSleeping ? { _target: subscribable$$1 } : computedObservable.subscribeToDependency(subscribable$$1));
    }
  }
}

computed.fn = {
  equalityComparer: valuesArePrimitiveAndEqual,
  getDependenciesCount: function () {
    return this[computedState].dependenciesCount
  },
  addDependencyTracking: function (id, target, trackingObj) {
    if (this[computedState].pure && target === this) {
      throw Error("A 'pure' computed must not be called recursively")
    }

    this[computedState].dependencyTracking[id] = trackingObj;
    trackingObj._order = this[computedState].dependenciesCount++;
    trackingObj._version = target.getVersion();
  },
  haveDependenciesChanged: function () {
    var id, dependency, dependencyTracking = this[computedState].dependencyTracking;
    for (id in dependencyTracking) {
      if (dependencyTracking.hasOwnProperty(id)) {
        dependency = dependencyTracking[id];
        if (dependency._target.hasChanged(dependency._version)) {
          return true
        }
      }
    }
  },
  markDirty: function () {
        // Process "dirty" events if we can handle delayed notifications
    if (this._evalDelayed && !this[computedState].isBeingEvaluated) {
      this._evalDelayed();
    }
  },
  isActive: function () {
    return this[computedState].isStale || this[computedState].dependenciesCount > 0
  },
  respondToChange: function () {
        // Ignore "change" events if we've already scheduled a delayed notification
    if (!this._notificationIsPending) {
      this.evaluatePossiblyAsync();
    }
  },
  subscribeToDependency: function (target) {
    if (target._deferUpdates && !this[computedState].disposeWhenNodeIsRemoved) {
      var dirtySub = target.subscribe(this.markDirty, this, 'dirty'),
        changeSub = target.subscribe(this.respondToChange, this);
      return {
        _target: target,
        dispose: function () {
          dirtySub.dispose();
          changeSub.dispose();
        }
      }
    } else {
      return target.subscribe(this.evaluatePossiblyAsync, this)
    }
  },
  evaluatePossiblyAsync: function () {
    var computedObservable = this,
      throttleEvaluationTimeout = computedObservable.throttleEvaluation;
    if (throttleEvaluationTimeout && throttleEvaluationTimeout >= 0) {
      clearTimeout(this[computedState].evaluationTimeoutInstance);
      this[computedState].evaluationTimeoutInstance = safeSetTimeout(function () {
        computedObservable.evaluateImmediate(true /* notifyChange */);
      }, throttleEvaluationTimeout);
    } else if (computedObservable._evalDelayed) {
      computedObservable._evalDelayed();
    } else {
      computedObservable.evaluateImmediate(true /* notifyChange */);
    }
  },
  evaluateImmediate: function (notifyChange) {
    var computedObservable = this,
      state = computedObservable[computedState],
      disposeWhen = state.disposeWhen;

    if (state.isBeingEvaluated) {
            // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
            // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
            // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
            // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
      return
    }

        // Do not evaluate (and possibly capture new dependencies) if disposed
    if (state.isDisposed) {
      return
    }

    if (state.disposeWhenNodeIsRemoved && !domNodeIsAttachedToDocument(state.disposeWhenNodeIsRemoved) || disposeWhen && disposeWhen()) {
            // See comment above about suppressDisposalUntilDisposeWhenReturnsFalse
      if (!state.suppressDisposalUntilDisposeWhenReturnsFalse) {
        computedObservable.dispose();
        return
      }
    } else {
            // It just did return false, so we can stop suppressing now
      state.suppressDisposalUntilDisposeWhenReturnsFalse = false;
    }

    state.isBeingEvaluated = true;
    try {
      this.evaluateImmediate_CallReadWithDependencyDetection(notifyChange);
    } finally {
      state.isBeingEvaluated = false;
    }

    if (!state.dependenciesCount) {
      computedObservable.dispose();
    }
  },
  evaluateImmediate_CallReadWithDependencyDetection: function (notifyChange) {
        // This function is really just part of the evaluateImmediate logic. You would never call it from anywhere else.
        // Factoring it out into a separate function means it can be independent of the try/catch block in evaluateImmediate,
        // which contributes to saving about 40% off the CPU overhead of computed evaluation (on V8 at least).

    var computedObservable = this,
      state = computedObservable[computedState];

        // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
        // Then, during evaluation, we cross off any that are in fact still being used.
    var isInitial = state.pure ? undefined : !state.dependenciesCount,   // If we're evaluating when there are no previous dependencies, it must be the first time
      dependencyDetectionContext = {
        computedObservable: computedObservable,
        disposalCandidates: state.dependencyTracking,
        disposalCount: state.dependenciesCount
      };

    begin({
      callbackTarget: dependencyDetectionContext,
      callback: computedBeginDependencyDetectionCallback,
      computed: computedObservable,
      isInitial: isInitial
    });

    state.dependencyTracking = {};
    state.dependenciesCount = 0;

    var newValue = this.evaluateImmediate_CallReadThenEndDependencyDetection(state, dependencyDetectionContext);

    if (computedObservable.isDifferent(state.latestValue, newValue)) {
      if (!state.isSleeping) {
        computedObservable.notifySubscribers(state.latestValue, 'beforeChange');
      }

      state.latestValue = newValue;

      if (state.isSleeping) {
        computedObservable.updateVersion();
      } else if (notifyChange) {
        computedObservable.notifySubscribers(state.latestValue);
      }
    }

    if (isInitial) {
      computedObservable.notifySubscribers(state.latestValue, 'awake');
    }
  },
  evaluateImmediate_CallReadThenEndDependencyDetection: function (state, dependencyDetectionContext) {
        // This function is really part of the evaluateImmediate_CallReadWithDependencyDetection logic.
        // You'd never call it from anywhere else. Factoring it out means that evaluateImmediate_CallReadWithDependencyDetection
        // can be independent of try/finally blocks, which contributes to saving about 40% off the CPU
        // overhead of computed evaluation (on V8 at least).

    try {
      var readFunction = state.readFunction;
      return state.evaluatorFunctionTarget ? readFunction.call(state.evaluatorFunctionTarget) : readFunction()
    } finally {
      end();

            // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
      if (dependencyDetectionContext.disposalCount && !state.isSleeping) {
        objectForEach(dependencyDetectionContext.disposalCandidates, computedDisposeDependencyCallback);
      }

      state.isStale = false;
    }
  },
  peek: function () {
        // Peek won't re-evaluate, except while the computed is sleeping or to get the initial value when "deferEvaluation" is set.
    var state = this[computedState];
    if ((state.isStale && !state.dependenciesCount) || (state.isSleeping && this.haveDependenciesChanged())) {
      this.evaluateImmediate();
    }
    return state.latestValue
  },
  limit: function (limitFunction) {
        // Override the limit function with one that delays evaluation as well
    subscribable.fn.limit.call(this, limitFunction);
    this._evalDelayed = function () {
      this._limitBeforeChange(this[computedState].latestValue);

      this[computedState].isStale = true; // Mark as dirty

            // Pass the observable to the "limit" code, which will access it when
            // it's time to do the notification.
      this._limitChange(this);
    };
  },
  dispose: function () {
    var state = this[computedState];
    if (!state.isSleeping && state.dependencyTracking) {
      objectForEach(state.dependencyTracking, function (id, dependency) {
        if (dependency.dispose) {
          dependency.dispose();
        }
      });
    }
    if (state.disposeWhenNodeIsRemoved && state.domNodeDisposalCallback) {
      removeDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback);
    }
    state.dependencyTracking = null;
    state.dependenciesCount = 0;
    state.isDisposed = true;
    state.isStale = false;
    state.isSleeping = false;
    state.disposeWhenNodeIsRemoved = null;
    state.readFunction = null;
    if (options.debug) {
      this._options = null;
    }
  }
};

var pureComputedOverrides = {
  beforeSubscriptionAdd: function (event) {
        // If asleep, wake up the computed by subscribing to any dependencies.
    var computedObservable = this,
      state = computedObservable[computedState];
    if (!state.isDisposed && state.isSleeping && event == 'change') {
      state.isSleeping = false;
      if (state.isStale || computedObservable.haveDependenciesChanged()) {
        state.dependencyTracking = null;
        state.dependenciesCount = 0;
        state.isStale = true;
        computedObservable.evaluateImmediate();
      } else {
                // First put the dependencies in order
        var dependeciesOrder = [];
        objectForEach(state.dependencyTracking, function (id, dependency) {
          dependeciesOrder[dependency._order] = id;
        });
                // Next, subscribe to each one
        arrayForEach(dependeciesOrder, function (id, order) {
          var dependency = state.dependencyTracking[id],
            subscription = computedObservable.subscribeToDependency(dependency._target);
          subscription._order = order;
          subscription._version = dependency._version;
          state.dependencyTracking[id] = subscription;
        });
      }
      if (!state.isDisposed) {     // test since evaluating could trigger disposal
        computedObservable.notifySubscribers(state.latestValue, 'awake');
      }
    }
  },
  afterSubscriptionRemove: function (event) {
    var state = this[computedState];
    if (!state.isDisposed && event == 'change' && !this.hasSubscriptionsForEvent('change')) {
      objectForEach(state.dependencyTracking, function (id, dependency) {
        if (dependency.dispose) {
          state.dependencyTracking[id] = {
            _target: dependency._target,
            _order: dependency._order,
            _version: dependency._version
          };
          dependency.dispose();
        }
      });
      state.isSleeping = true;
      this.notifySubscribers(undefined, 'asleep');
    }
  },
  getVersion: function () {
        // Because a pure computed is not automatically updated while it is sleeping, we can't
        // simply return the version number. Instead, we check if any of the dependencies have
        // changed and conditionally re-evaluate the computed observable.
    var state = this[computedState];
    if (state.isSleeping && (state.isStale || this.haveDependenciesChanged())) {
      this.evaluateImmediate();
    }
    return subscribable.fn.getVersion.call(this)
  }
};

var deferEvaluationOverrides = {
  beforeSubscriptionAdd: function (event) {
        // This will force a computed with deferEvaluation to evaluate when the first subscription is registered.
    if (event == 'change' || event == 'beforeChange') {
      this.peek();
    }
  }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.computed constructor
if (canSetPrototype) {
  setPrototypeOf(computed.fn, subscribable.fn);
}

// Set the proto chain values for ko.hasPrototype
var protoProp = observable.protoProperty; // == "__ko_proto__"
computed[protoProp] = observable;
computed.fn[protoProp] = computed;

function isComputed (instance) {
  return hasPrototype(instance, computed)
}

function isPureComputed (instance) {
  return hasPrototype(instance, computed)
        && instance[computedState] && instance[computedState].pure
}

function pureComputed (evaluatorFunctionOrOptions, evaluatorFunctionTarget) {
  if (typeof evaluatorFunctionOrOptions === 'function') {
    return computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, {'pure': true})
  } else {
    evaluatorFunctionOrOptions = extend({}, evaluatorFunctionOrOptions);   // make a copy of the parameter object
    evaluatorFunctionOrOptions.pure = true;
    return computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget)
  }
}

function throttleExtender(target, timeout) {
    // Throttling means two things:

    // (1) For dependent observables, we throttle *evaluations* so that, no matter how fast its dependencies
    //     notify updates, the target doesn't re-evaluate (and hence doesn't notify) faster than a certain rate
    target.throttleEvaluation = timeout;

    // (2) For writable targets (observables, or writable dependent observables), we throttle *writes*
    //     so the target cannot change value synchronously or faster than a certain rate
    var writeTimeoutInstance = null;
    return computed({
        read: target,
        write: function(value) {
            clearTimeout(writeTimeoutInstance);
            writeTimeoutInstance = setTimeout(function() {
                target(value);
            }, timeout);
        }
    });
}


extenders.throttle = throttleExtender;

//
// tko.computed - Exports
//
// knockout -> tko changes:
//      Deprecates `dependentObservable` (use `computed`)
//

function LAMBDA () {}

/**
 * @ operator - recursively call the identifier if it's a function
 * @param  {operand} a ignored
 * @param  {operand} b The variable to be called (if a function) and unwrapped
 * @return {value}   The result.
 */
function unwrapOrCall (a, b) {
  while (typeof b === 'function') { b = b(); }
  return b
}

const operators = {
  // unary
  '@': unwrapOrCall,
  '#': (a, b) => () => unwrap(b), // Convert to read-only.
  '=>': LAMBDA,
  '!': function not (a, b) { return !b },
  '!!': function notnot (a, b) { return !!b },
  '++': function preinc (a, b) { return ++b },
  '--': function preinc (a, b) { return --b },
  // mul/div
  '*': function mul (a, b) { return a * b },
  '/': function div (a, b) { return a / b },
  '%': function mod (a, b) { return a % b },
  // sub/add
  '+': function add (a, b) { return a + b },
  '-': function sub (a, b) { return (a || 0) - (b || 0) },
  '&-': function neg (a, b) { return -1 * b },
  // relational
  '<': function lt (a, b) { return a < b },
  '<=': function le (a, b) { return a <= b },
  '>': function gt (a, b) { return a > b },
  '>=': function ge (a, b) { return a >= b },
  //    TODO: 'in': function (a, b) { return a in b; },
  //    TODO: 'instanceof': function (a, b) { return a instanceof b; },
  // equality
  '==': function equal (a, b) { return a === b },
  '!=': function ne (a, b) { return a !== b },
  '===': function sequal (a, b) { return a === b },
  '!==': function sne (a, b) { return a !== b },
  // bitwise
  '&': function bitAnd (a, b) { return a & b },
  '^': function xor (a, b) { return a ^ b },
  '|': function bitOr (a, b) { return a | b },
  // logic
  '&&': function logicAnd (a, b) { return a && b },
  '||': function logicOr (a, b) { return a || b },
  // Access
  '.': function member (a, b) { return a[b] },
  '[': function member (a, b) { return a[b] },
  // conditional/ternary
  // '?': ternary See Node.js
  // Function-Call
  'call': function callOp (a, b) { return a.apply(null, b) }
};

/* Order of precedence from:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
*/

  // Our operator - unwrap/call
operators['@'].precedence = 21;
operators['#'].precedence = 21;

  // lambda
operators['=>'].precedence = 20;

  // Member
operators['.'].precedence = 19;
operators['['].precedence = 19;

  // Logical not
operators['!'].precedence = 16;
operators['!!'].precedence = 16; // explicit double-negative

  // Prefix inc/dec
operators['++'].precedence = 16;
operators['--'].precedence = 16;
operators['&-'].precedence = 16;

  // mul/div/remainder
operators['%'].precedence = 14;
operators['*'].precedence = 14;
operators['/'].precedence = 14;

  // add/sub
operators['+'].precedence = 13;
operators['-'].precedence = 13;

  // bitwise
operators['|'].precedence = 12;
operators['^'].precedence = 11;
operators['&'].precedence = 10;

  // comparison
operators['<'].precedence = 11;
operators['<='].precedence = 11;
operators['>'].precedence = 11;
operators['>='].precedence = 11;

  // operators['in'].precedence = 8;
  // operators['instanceof'].precedence = 8;
  // equality
operators['=='].precedence = 10;
operators['!='].precedence = 10;
operators['==='].precedence = 10;
operators['!=='].precedence = 10;

  // logic
operators['&&'].precedence = 6;
operators['||'].precedence = 5;

operators['&&'].earlyOut = (a) => !a;
operators['||'].earlyOut = (a) => a;

  // Call a function
operators['call'].precedence = 1;

const IS_EXPR_OR_IDENT = Symbol('Node - Is Expression Or Identifier');

class Node {
  constructor (lhs, op, rhs) {
    this.lhs = lhs;
    this.op = op;
    this.rhs = rhs;
  }

  static get operators () { return operators }

  get_leaf_value (leaf, context, globals, node) {
    if (typeof leaf === 'function') {
      // Expressions on observables are nonsensical, so we unwrap any
      // function values (e.g. identifiers).
      return unwrap(leaf())
    }

    // primitives
    if (typeof leaf !== 'object' || leaf === null) { return leaf }

    // Identifiers and Expressions
    if (leaf[Node.isExpressionOrIdentifierSymbol]) {
      // lhs is passed in as the parent of the leaf. It will be defined in
      // cases like a.b.c as 'a' for 'b' then as 'b' for 'c'.
      return unwrap(leaf.get_value(undefined, context, globals, node))
    }

    // Plain object/class.
    return leaf
  }

  /**
   * Return a function that calculates and returns an expression's value
   * when called.
   * @param  {array} ops  The operations to perform
   * @return {function}   The function that calculates the expression.
   *
   * Note that for a lambda, we do not evaluate the RHS expression until
   * the lambda is called.
   */
  get_value (notused, context, globals, node) {
    var node = this;

    if (node.op === LAMBDA) {
      return () => node.get_leaf_value(node.rhs, context, globals, node)
    }

    const lhv = node.get_leaf_value(node.lhs, context, globals, node);
    const earlyOut = node.op.earlyOut;

    if (earlyOut && earlyOut(lhv)) { return lhv }
    const rhv = node.get_leaf_value(node.rhs, context, globals, node);

    return node.op(lhv, rhv, context, globals)
  }

  //
  // Class variables.
  //
  static get isExpressionOrIdentifierSymbol () { return IS_EXPR_OR_IDENT }
  get [IS_EXPR_OR_IDENT] () { return true }

  static value_of (item, context, globals, node) {
    if (item && item[Node.isExpressionOrIdentifierSymbol]) {
      return item.get_value(item, context, globals, node)
    }
    return item
  }

  /**
  *  Convert an array of nodes to an executable tree.
  *  @return {object} An object with a `lhs`, `rhs` and `op` key, corresponding
  *                      to the left hand side, right hand side, and
  *                      operation function.
  */
  static create_root (nodes) {
    var root, leaf, op, value;

    // Prime the leaf = root node.
    leaf = root = new Node(nodes.shift(), nodes.shift(), nodes.shift());

    while (true) {
      op = nodes.shift();
      value = nodes.shift();
      if (!op) {
        break
      }
      if (op.precedence < root.op.precedence) {
        // rebase
        root = new Node(root, op, value);
        leaf = root;
      } else {
        leaf.rhs = new Node(leaf.rhs, op, value);
        leaf = leaf.rhs;
      }
    }
    // console.log('tree', root)
    return root
  }
}

/**
 * Because of cyclical dependencies on operators <-> Node <-> value_of,
 * we need to patch this in here.
 */
operators['?'] = function ternary (a, b, context, globals, node) {
  return Node.value_of(a ? b.yes : b.no, context, globals, node)
};
operators['?'].precedence = 4;

class Expression {
  constructor (nodes) {
    this.nodes = nodes;
    this.root = Node.create_root(nodes);
  }

  /**
   * Return the value of `this` Expression instance.
   */
  get_value (parent, context, globals, node) {
    if (!this.root) {
      this.root = Node.create_root(this.nodes);
    }
    return this.root.get_value(parent, context, globals, node)
  }
}

Expression.prototype[Node.isExpressionOrIdentifierSymbol] = true;

class Arguments {
  constructor (parser, args) {
    this.parser = parser;
    this.args = args;
  }

  get_value (parent, context, globals, node) {
    var deReffedArgs = [];
    for (var i = 0, j = this.args.length; i < j; ++i) {
      deReffedArgs.push(Node.value_of(this.args[i], context, globals, node));
    }
    return deReffedArgs
  };

  get [Node.isExpressionOrIdentifierSymbol] () { return true }
}

/**
 * The following regular expressions were generated by
 *  https://mathiasbynens.be/demo/javascript-identifier-regex
 */
var IDStart = /[\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;

var IDContinue = /[\$0-9A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;

class Identifier {
  constructor (parser, token, dereferences) {
    this.token = token;
    this.dereferences = dereferences;
    this.parser = parser;
  }

  /**
   * Apply all () and [] functions on the identifier to the lhs value e.g.
   * a()[3] has deref functions that are essentially this:
   *     [_deref_call, _deref_this where this=3]
   *
   * @param  {mixed} value  Should be an object.
   * @return {mixed}        The dereferenced value.
   *
   * [1] We want to bind any function that is a method of an object, but not
   *     corrupt any values (e.g. computed()s).   e.g. Running x.bind(obj) where
   *     we're given `data-bind='binding: obj.x'` and x is a computed will
   *     break the computed's `this` and it will stop working as expected.
   *
   *     The test `!last_value.hasOwnProperty(member)`
   *     distinguishes between functions on the prototype chain (prototypal
   *     members) and value-members added directly to the object.  This may
   *     not be the canonical test for this relationship, but it succeeds
   *     in the known test cases.
   *
   *     See: `this` tests of our dereference function.
   */
  dereference (value, $context, globals, node) {
    let member;
    let refs = this.dereferences || [];
    const $data = $context.$data || {};
    let lastValue;  // becomes `this` in function calls to object properties.
    let i, n;

    for (i = 0, n = refs.length; i < n; ++i) {
      member = Node.value_of(refs[i], $context, globals, node);

      if (typeof value === 'function' && refs[i] instanceof Arguments) {
        // fn(args)
        value = value.apply(lastValue || $data, member);
        lastValue = value;
      } else {
        // obj[x] or obj.x dereference.  Note that obj may be a function.
        lastValue = value;
        value = Node.value_of(value[member], $context, globals, node);
      }
    }

    // [1] See note above.
    if (typeof value === 'function' && n > 0 && lastValue !== value &&
        !lastValue.hasOwnProperty(member)) {
      return value.bind(lastValue)
    }

    return value
  };

  /**
   * Return the value as one would get it from the top-level i.e.
   * $data.token/$context.token/globals.token; this does not return intermediate
   * values on a chain of members i.e. $data.hello.there -- requesting the
   * Identifier('there').value will return $data/$context/globals.there.
   *
   * This will dereference using () or [arg] member.
   * @param  {object | Identifier | Expression} parent
   * @return {mixed}  Return the primitive or an accessor.
   */
  get_value (parent, context, globals, node) {
    const intermediate = parent && !(parent instanceof Identifier)
      ? Node.value_of(parent, context, globals, node)[this.token]
      : context.lookup(this.token, globals, node);
    return this.dereference(intermediate, context, globals, node)
  }

  assign (object, property, value) {
    if (isWriteableObservable(object[property])) {
      object[property](value);
    } else if (!isObservable(object[property])) {
      object[property] = value;
    }
  };

  /**
   * Set the value of the Identifier.
   *
   * @param {Mixed} new_value The value that Identifier is to be set to.
   */
  set_value (new_value, $context, globals) {
    const $data = $context.$data || {};
    const refs = this.dereferences || [];
    let leaf = this.token;
    let i, n, root;

    if (Object.hasOwnProperty.call($data, leaf)) {
      root = $data;
    } else if (Object.hasOwnProperty.call($context, leaf)) {
      root = $context;
    } else if (Object.hasOwnProperty.call(globals, leaf)) {
      root = globals;
    } else {
      throw new Error('Identifier::set_value -- ' +
        "The property '" + leaf + "' does not exist " +
        'on the $data, $context, or globals.')
    }

    // Degenerate case. {$data|$context|global}[leaf] = something;
    n = refs.length;
    if (n === 0) {
      this.assign(root, leaf, new_value);
      return
    }

    // First dereference is {$data|$context|global}[token].
    root = root[leaf];

    // We cannot use this.dereference because that gives the leaf; to evoke
    // the ES5 setter we have to call `obj[leaf] = new_value`
    for (i = 0; i < n - 1; ++i) {
      leaf = refs[i];
      if (leaf instanceof Arguments) {
        root = root();
      } else {
        root = root[Node.value_of(leaf)];
      }
    }

    // We indicate that a dereference is a function when it is `true`.
    if (refs[i] === true) {
      throw new Error('Cannot assign a value to a function.')
    }

    // Call the setter for the leaf.
    if (refs[i]) {
      this.assign(root, Node.value_of(refs[i]), new_value);
    }
  };

  /**
   * Determine if a character is a valid item in an identifier.
   * Note that we do not check whether the first item is a number, nor do we
   * support unicode identifiers here.
   *
   * From:  http://stackoverflow.com/a/9337047
   * @param  {String}  ch  The character
   * @return {Boolean}     True if this is a valid identifier
   */
  // function is_identifier_char(ch) {
  //   return (ch >= 'A' && ch <= 'Z') ||
  //          (ch >= 'a' && ch <= 'z') ||
  //          (ch >= '0' && ch <= 9) ||
  //           ch === '_' || ch === '$';
  // }
  static is_valid_start_char (ch) {
    return IDStart.test(ch)
  }

  static is_valid_continue_char (ch) {
    return IDContinue.test(ch)
  }

  get [Node.isExpressionOrIdentifierSymbol] () { return true }
}

class Ternary {
  constructor (yes, no) {
    Object.assign(this, {yes, no});
  }

  get_value () { return this }

  get [Node.isExpressionOrIdentifierSymbol] () { return true }
}

/**
 * Originally based on (public domain):
 * https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js
 */

const escapee = {
  "'": "'",
  '"': '"',
  '`': '`',
  '\\': '\\',
  '/': '/',
  '$': '$',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
};

/**
 * Construct a new Parser instance with new Parser(node, context)
 * @param {Node} node    The DOM element from which we parsed the
 *                         content.
 * @param {object} context The Knockout context.
 * @param {object} globals An object containing any desired globals.
 */
class Parser {
  white () {
    var ch = this.ch;
    while (ch && ch <= ' ') {
      ch = this.next();
    }
    return this.comment(ch)
  }

/**
 * Slurp any C or C++ style comments
 */
  comment (ch) {
    if (ch !== '/') { return ch }
    var p = this.at;
    var second = this.lookahead();
    if (second === '/') {
      while (ch) {
        ch = this.next();
        if (ch === '\n' || ch === '\r') { break }
      }
      ch = this.next();
    } else if (second === '*') {
      while (ch) {
        ch = this.next();
        if (ch === '*' && this.lookahead() === '/') {
          this.next();
          break
        }
      }
      if (!ch) {
        this.error('Unclosed comment, starting at character ' + p);
      }
      this.next();
      return this.white()
    }
    return ch
  };

  next (c) {
    if (c && c !== this.ch) {
      this.error("Expected '" + c + "' but got '" + this.ch + "'");
    }
    this.ch = this.text.charAt(this.at);
    this.at += 1;
    return this.ch
  }

  lookahead () {
    return this.text[this.at]
  }

  error (m) {
    if (m instanceof Error) { throw m }
    let [name, msg] = m.name ? [m.name, m.message] : [m, ''];
    const message = `\n${name} ${msg} of
    ${this.text}\n` + Array(this.at).join(' ') + '_/ 🔥 \\_\n';
    throw new Error(message)
  }

  name () {
  // A name of a binding
    var name = '';
    var enclosedBy;
    this.white();

    var ch = this.ch;

    if (ch === "'" || ch === '"') {
      enclosedBy = ch;
      ch = this.next();
    }

    while (ch) {
      if (enclosedBy && ch === enclosedBy) {
        this.white();
        ch = this.next();
        if (ch !== ':' && ch !== ',') {
          this.error(
          'Object name: ' + name + ' missing closing ' + enclosedBy
        );
        }
        return name
      } else if (ch === ':' || ch <= ' ' || ch === ',' || ch === '|') {
        return name
      }
      name += ch;
      ch = this.next();
    }

    return name
  }

  number () {
    let number;
    let string = '';
    let ch = this.ch;

    if (ch === '-') {
      string = '-';
      ch = this.next('-');
    }
    while (ch >= '0' && ch <= '9') {
      string += ch;
      ch = this.next();
    }
    if (ch === '.') {
      string += '.';
      ch = this.next();
      while (ch && ch >= '0' && ch <= '9') {
        string += ch;
        ch = this.next();
      }
    }
    if (ch === 'e' || ch === 'E') {
      string += ch;
      ch = this.next();
      if (ch === '-' || ch === '+') {
        string += ch;
        ch = this.next();
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        ch = this.next();
      }
    }
    number = +string;
    if (!isFinite(number)) {
      options.onError(new Error('Bad number: ' + number + ' in ' + string));
    } else {
      return number
    }
  }

/**
 * Add a property to 'object' that equals the given value.
 * @param  {Object} object The object to add the value to.
 * @param  {String} key    object[key] is set to the given value.
 * @param  {mixed}  value  The value, may be a primitive or a function. If a
 *                         function it is unwrapped as a property.
 */
  objectAddValue (object, key, value) {
    if (value && value[Node.isExpressionOrIdentifierSymbol]) {
      Object.defineProperty(object, key, {
        get: () => Node.value_of(value, ...this.currentContextGlobals),
        enumerable: true
      });
    } else if (Array.isArray(value)) {
      Object.defineProperty(object, key, {
        get: () => value.map(v => Node.value_of(v, ...this.currentContextGlobals)),
        enumerable: true
      });
    } else {
    // primitives
      object[key] = value;
    }
  }

  object () {
    let key;
    let object = {};
    let ch = this.ch;

    if (ch === '{') {
      this.next('{');
      ch = this.white();
      if (ch === '}') {
        ch = this.next('}');
        return object
      }
      while (ch) {
        if (ch === '"' || ch === "'" || ch === '`') {
          key = this.string();
        } else {
          key = this.name();
        }
        this.white();
        ch = this.next(':');
        if (Object.hasOwnProperty.call(object, key)) {
          this.error('Duplicate key "' + key + '"');
        }

        this.objectAddValue(object, key, this.expression());

        ch = this.white();
        if (ch === '}') {
          ch = this.next('}');
          return object
        }

        this.next(',');
        ch = this.white();
      }
    }
    this.error('Bad object');
  }

/**
 * Read up to delim and return the string
 * @param  {string} delim The delimiter, either ' or "
 * @return {string}       The string read.
 */
  readString (delim) {
    let string = '';
    let nodes = [''];
    let plusOp = operators['+'];
    let hex;
    let i;
    let uffff;
    let interpolate = delim === '`';
    let ch = this.next();

    while (ch) {
      if (ch === delim) {
        ch = this.next();
        if (interpolate) { nodes.push(plusOp); }
        nodes.push(string);
        return nodes
      }
      if (ch === '\\') {
        ch = this.next();
        if (ch === 'u') {
          uffff = 0;
          for (i = 0; i < 4; i += 1) {
            hex = parseInt(ch = this.next(), 16);
            if (!isFinite(hex)) {
              break
            }
            uffff = uffff * 16 + hex;
          }
          string += String.fromCharCode(uffff);
        } else if (typeof escapee[ch] === 'string') {
          string += escapee[ch];
        } else {
          break
        }
      } else if (interpolate && ch === '$') {
        ch = this.next();
        if (ch === '{') {
          this.next('{');
          nodes.push(plusOp);
          nodes.push(string);
          nodes.push(plusOp);
          nodes.push(this.expression());
          string = '';
        // this.next('}');
        } else {
          string += '$' + ch;
        }
      } else {
        string += ch;
      }
      ch = this.next();
    }

    this.error('Bad string');
  }

  string () {
    var ch = this.ch;
    if (ch === '"') {
      return this.readString('"').join('')
    } else if (ch === "'") {
      return this.readString("'").join('')
    } else if (ch === '`') {
      return Node.create_root(this.readString('`'))
    }

    this.error('Bad string');
  }

  array () {
    let array = [];
    let ch = this.ch;

    if (ch === '[') {
      ch = this.next('[');
      this.white();
      if (ch === ']') {
        ch = this.next(']');
        return array
      }
      while (ch) {
        array.push(this.expression());
        ch = this.white();
        if (ch === ']') {
          ch = this.next(']');
          return array
        }
        this.next(',');
        ch = this.white();
      }
    }
    this.error('Bad array');
  }

  value () {
    var ch;
    this.white();
    ch = this.ch;
    switch (ch) {
      case '{': return this.object()
      case '[': return this.array()
      case '"': case "'": case '`': return this.string()
      case '-': return this.number()
      default:
        return ch >= '0' && ch <= '9' ? this.number() : this.identifier()
    }
  }

/**
 * Get the function for the given operator.
 * A `.precedence` value is added to the function, with increasing
 * precedence having a higher number.
 * @return {function} The function that performs the infix operation
 */
  operator (opts) {
    let op = '';
    let opFn;
    let ch = this.white();
    let isIdentifierChar = Identifier.is_valid_start_char;

    while (ch) {
      if (isIdentifierChar(ch) || ch <= ' ' || ch === '' ||
        ch === '"' || ch === "'" || ch === '{' || ch === '(' ||
        ch === '`' || ch === ')' || (ch <= '9' && ch >= '0')) {
        break
      }

      if (!opts.not_an_array && ch === '[') {
        break
      }

      op += ch;
      ch = this.next();

    // An infix followed by the prefix e.g. a + @b
    // TODO: other prefix unary operators
      if (ch === '@') {
        break
      }

      isIdentifierChar = Identifier.is_valid_continue_char;
    }

    if (op !== '') {
      if (opts.prefix && op === '-') { op = '&-'; }
      opFn = operators[op];

      if (!opFn) {
        this.error("Bad operator: '" + op + "'.");
      }
    }

    return opFn
  }

/**
 * Filters
 * Returns what the Node interprets as an "operator".
 * e.g.
 *   <span data-bind="text: name | fit:20 | uppercase"></span>
 */
  filter () {
    let ch = this.next();
    let args = [];
    let nextFilter = function (v) { return v };
    let name = this.name();

    if (!options.filters[name]) {
      options.onError('Cannot find filter by the name of: ' + name);
    }

    ch = this.white();

    while (ch) {
      if (ch === ':') {
        ch = this.next();
        args.push(this.expression('|'));
      }

      if (ch === '|') {
        nextFilter = this.filter();
        break
      }

      if (ch === ',') { break }

      ch = this.white();
    }

    var filter = function filter (value, ignored, context, globals, node) {
      var argValues = [value];

      for (var i = 0, j = args.length; i < j; ++i) {
        argValues.push(Node.value_of(args[i], context, globals, node));
      }

      return nextFilter(options.filters[name].apply(null, argValues))
    };

  // Lowest precedence.
    filter.precedence = 1;
    return filter
  }

/**
 * Parse an expression – builds an operator tree, in something like
 * Shunting-Yard.
 *   See: http://en.wikipedia.org/wiki/Shunting-yard_algorithm
 *
 * @return {function}   A function that computes the value of the expression
 *                      when called or a primitive.
 */
  expression (filterable) {
    let op;
    let nodes = [];
    let ch = this.white();

    while (ch) {
    // unary prefix operators
      op = this.operator({ prefix: true });
      if (op) {
        nodes.push(undefined);  // LHS Tree node.
        nodes.push(op);
        ch = this.white();
      }

      if (ch === '(') {
        this.next();
        nodes.push(this.expression());
        this.next(')');
      } else {
        nodes.push(this.value());
      }
      ch = this.white();

      if (ch === ':' || ch === '}' || ch === ',' || ch === ']' ||
        ch === ')' || ch === '' || ch === '`' || (ch === '|' && filterable === '|')) {
        break
      }

    // filters
      if (ch === '|' && this.lookahead() !== '|' && filterable) {
        nodes.push(this.filter());
        nodes.push(undefined);
        break
      }

    // infix or postfix operators
      op = this.operator({ not_an_array: true });

      if (op === operators['?']) {
        this.ternary(nodes);
        break
      } else if (op === operators['.']) {
        nodes.push(op);
        nodes.push(this.member());
        op = null;
      } else if (op === operators['[']) {
        nodes.push(op);
        nodes.push(this.expression());
        ch = this.next(']');
        op = null;
      } else if (op) {
        nodes.push(op);
      }

      ch = this.white();

      if (ch === ']' || (!op && ch === '(')) { break }
    }

    if (nodes.length === 0) {
      return undefined
    }

    var dereferences = this.dereferences();

    if (nodes.length === 1 && !dereferences.length) {
      return nodes[0]
    }

    for (var i = 0, j = dereferences.length; i < j; ++i) {
      var deref = dereferences[i];
      if (deref.constructor === Arguments) {
        nodes.push(operators.call);
      } else {
        nodes.push(operators['.']);
      }
      nodes.push(deref);
    }

    return new Expression(nodes)
  }

  ternary (nodes) {
    var ternary = new Ternary();
    ternary.yes = this.expression();
    this.next(':');
    ternary.no = this.expression();
    nodes.push(operators['?']);
    nodes.push(ternary);
  }

/**
 * Parse the arguments to a function, returning an Array.
 *
 */
  funcArguments () {
    let args = [];
    let ch = this.next('(');

    while (ch) {
      ch = this.white();
      if (ch === ')') {
        this.next(')');
        return new Arguments(this, args)
      } else {
        args.push(this.expression());
        ch = this.white();
      }
      if (ch !== ')') { this.next(','); }
    }

    this.error('Bad arguments to function');
  }

/**
 * The literal string reference `abc` in an `x.abc` expression.
 */
  member () {
    let member = '';
    let ch = this.white();
    let isIdentifierChar = Identifier.is_valid_start_char;

    while (ch) {
      if (!isIdentifierChar(ch)) {
        break
      }
      member += ch;
      ch = this.next();
      isIdentifierChar = Identifier.is_valid_continue_char;
    }
    return member
  }

/**
 * A dereference applies to an identifer, being either a function
 * call "()" or a membership lookup with square brackets "[member]".
 * @return {fn or undefined}  Dereference function to be applied to the
 *                            Identifier
 */
  dereference () {
    let member;
    let ch = this.white();

    while (ch) {
      if (ch === '(') {
      // a(...) function call
        return this.funcArguments()
      } else if (ch === '[') {
      // a[x] membership
        this.next('[');
        member = this.expression();
        this.white();
        this.next(']');

        return member
      } else if (ch === '.') {
      // a.x membership
        this.next('.');
        return this.member()
      } else {
        break
      }
    }
  }

  dereferences () {
    let ch = this.white();
    let dereferences = [];
    let deref;

    while (ch) {
      deref = this.dereference();
      if (deref !== undefined) {
        dereferences.push(deref);
      } else {
        break
      }
    }
    return dereferences
  }

  identifier () {
    let token = '';
    let isIdentifierChar = Identifier.is_valid_start_char;
    let ch = this.white();

    while (ch) {
      if (!isIdentifierChar(ch)) {
        break
      }
      token += ch;
      ch = this.next();
      isIdentifierChar = Identifier.is_valid_continue_char;
    }
    switch (token) {
      case 'true': return true
      case 'false': return false
      case 'null': return null
      case 'undefined': return void 0
      case 'function':
        throw new Error('Knockout: Anonymous functions are no longer supported, but `=>` lambas are.')
    // return this.anonymous_fn();
    }
    return new Identifier(this, token, this.dereferences())
  }

  readBindings () {
    let key;
    let bindings = {};
    let sep;
    let expr;
    let ch = this.ch;

    while (ch) {
      key = this.name();
      sep = this.white();

      if (!sep || sep === ',') {
        if (sep) {
          ch = this.next(',');
        } else {
          ch = '';
        }
      // A "bare" binding e.g. "text"; substitute value of 'null'
      // so it becomes "text: null".
        bindings[key] = null;
      } else {
        if (key.indexOf('.') !== -1) {
        // Namespaced – i.e.
        //    `attr.css: x` becomes `attr: { css: x }`
        //     ^^^ - key
          key = key.split('.');
          bindings[key[0]] = bindings[key[0]] || {};

          if (key.length !== 2) {
            options.onError('Binding ' + key + ' should have two parts (a.b).');
          } else if (bindings[key[0]].constructor !== Object) {
            options.onError('Binding ' + key[0] + '.' + key[1] + ' paired with a non-object.');
          }

          ch = this.next(':');
          this.objectAddValue(bindings[key[0]], key[1], this.expression(true));
        } else {
          ch = this.next(':');
          if (bindings[key] && typeof bindings[key] === 'object' && bindings[key].constructor === Object) {
          // Extend a namespaced bindings e.g. we've previously seen
          // on.x, now we're seeing on: { 'abc' }.
            expr = this.expression(true);
            if (typeof expr !== 'object' || expr.constructor !== Object) {
              options.onError('Expected plain object for ' + key + ' value.');
            } else {
              extend(bindings[key], expr);
            }
          } else {
            bindings[key] = this.expression(true);
          }
        }

        this.white();
        if (this.ch) {
          ch = this.next(',');
        } else {
          ch = '';
        }
      }
    }
    return bindings
  }

  valueAsAccessor (value, context, globals, node) {
    if (!value) { return () => value }
    if (typeof value === 'function') { return value }

    if (value[Node.isExpressionOrIdentifierSymbol]) {
      return () => Node.value_of(value, context, globals, node)
    }

    if (Array.isArray(value)) {
      return () => value.map(v => Node.value_of(v, context, globals, node))
    }

    if (typeof (value) !== 'function') {
      return () => clonePlainObjectDeep(value)
    }

    throw new Error('Value has cannot be converted to accessor: ' + value)
  }

  /**
  * Convert result[name] from a value to a function (i.e. `valueAccessor()`)
  * @param  {object} result [Map of top-level names to values]
  * @return {object}        [Map of top-level names to functions]
  *
  * Accessors may be one of (below) constAccessor, identifierAccessor,
  * expressionAccessor, or nodeAccessor.
  */
  convertToAccessors (result, context, globals, node) {
    objectForEach(result, (name, value) => {
      if (value instanceof Identifier) {
        // Return a function that, with no arguments returns
        // the value of the identifier, otherwise sets the
        // value of the identifier to the first given argument.
        Object.defineProperty(result, name, {
          value: function (optionalValue, options$$1) {
            const currentValue = value.get_value(undefined, context, globals, node);
            if (arguments.length === 0) { return currentValue }
            const unchanged = optionalValue === currentValue;
            if (options$$1 && options$$1.onlyIfChanged && unchanged) { return }
            return value.set_value(optionalValue, context, globals)
          }
        });
      } else {
        result[name] = this.valueAsAccessor(value, context, globals, node);
      }
    });
    return result
  }

  runParse (source, fn) {
    this.text = (source || '').trim();
    this.at = 0;
    this.ch = ' ';

    try {
      var result = fn();
      this.white();
      if (this.ch) {
        this.error('Syntax Error');
      }
      return result
    } catch (e) {
      options.onError(e);
    }
  }

  /**
   * Get the bindings as name: accessor()
   * @param  {string} source The binding string to parse.
   * @return {object}        Map of name to accessor function.
   */
  parse (source, context = {}, globals = {}, node) {
    if (!source) { return () => null }
    this.currentContextGlobals = [context, globals, node];
    const parseFn = () => this.readBindings();
    const bindingAccessors = this.runParse(source, parseFn);
    return this.convertToAccessors(bindingAccessors, context, globals, node)
  }

  /**
   * Return a function that evaluates and returns the result of the expression.
   */
  parseExpression (source, context = {}, globals = {}, node) {
    if (!source) { return () => '' }
    this.currentContextGlobals = [context, globals, node];
    const parseFn = () => this.expression(true);
    const bindingAccessors = this.runParse(source, parseFn);
    return this.valueAsAccessor(bindingAccessors, context, globals, node)
  }
}

/* eslint no-cond-assign: 0 */

// The following regular expressions will be used to split an object-literal string into tokens

// These two match strings, either with double quotes or single quotes
var stringDouble = '"(?:[^"\\\\]|\\\\.)*"';
var stringSingle = "'(?:[^'\\\\]|\\\\.)*'";
var stringRegexp = '/(?:[^/\\\\]|\\\\.)*/\w*';
var specials = ',"\'{}()/:[\\]';
var everyThingElse = '[^\\s:,/][^' + specials + ']*[^\\s' + specials + ']';
var oneNotSpace = '[^\\s]';
var bindingToken = RegExp(stringDouble + '|' + stringSingle + '|' + stringRegexp + '|' + everyThingElse + '|' + oneNotSpace, 'g');
var divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/;
var keywordRegexLookBehind = {
    'in': 1,
    'return': 1,
    'typeof': 1
  };

/**
 * Break a binding string (data-bind='x: val, y: ..') into a stable array
 * of {key: value}.
 */
function parseObjectLiteral(objectLiteralString) {
  // Trim leading and trailing spaces from the string
  var str = stringTrim(objectLiteralString);

  // Trim braces '{' surrounding the whole object literal
  if (str.charCodeAt(0) === 123) str = str.slice(1, -1);

  // Split into tokens
  var result = [],
    toks = str.match(bindingToken),
    key, values = [],
    depth = 0;

  if (!toks) { return [] }

  // Append a comma so that we don't need a separate code block to deal with the last item
  toks.push(',');

  for (var i = 0, tok; tok = toks[i]; ++i) {
    var c = tok.charCodeAt(0);
    // A comma signals the end of a key/value pair if depth is zero
    if (c === 44) { // ","
      if (depth <= 0) {
        result.push((key && values.length) ? {
          key: key,
          value: values.join('')
        } : {
          'unknown': key || values.join('')
        });
        key = depth = 0;
        values = [];
        continue;
      }
      // Simply skip the colon that separates the name and value
    } else if (c === 58) { // ":"
      if (!depth && !key && values.length === 1) {
        key = values.pop();
        continue;
      }
      // A set of slashes is initially matched as a regular expression, but could be division
    } else if (c === 47 && i && tok.length > 1) { // "/"
      // Look at the end of the previous token to determine if the slash is actually division
      var match = toks[i - 1].match(divisionLookBehind);
      if (match && !keywordRegexLookBehind[match[0]]) {
        // The slash is actually a division punctuator; re-parse the remainder of the string (not including the slash)
        str = str.substr(str.indexOf(tok) + 1);
        toks = str.match(bindingToken);
        toks.push(',');
        i = -1;
        // Continue with just the slash
        tok = '/';
      }
      // Increment depth for parentheses, braces, and brackets so that interior commas are ignored
    } else if (c === 40 || c === 123 || c === 91) { // '(', '{', '['
      ++depth;
    } else if (c === 41 || c === 125 || c === 93) { // ')', '}', ']'
      --depth;
      // The key will be the first token; if it's a string, trim the quotes
    } else if (!key && !values.length && (c === 34 || c === 39)) { // '"', "'"
      tok = tok.slice(1, -1);
    }
    values.push(tok);
  }

  return result;
}

class BindingHandlerObject {
  set (nameOrObject, value) {
    if (typeof nameOrObject === 'string') {
      this[nameOrObject] = value;
    } else if (typeof nameOrObject === 'object') {
      if (value !== undefined) {
        options.onError(
          new Error('Given extraneous `value` parameter (first param should be a string, but it was an object).' + nameOrObject));
      }
      Object.assign(this, nameOrObject);
    } else {
      options.onError(
        new Error('Given a bad binding handler type: ' + nameOrObject));
    }
  }

  /**
   * The handler may have a `.` in it, e.g. `attr.title`, in which case the
   * handler is `attr`.  Otherwise it's the name given
   */
  get (nameOrDotted) {
    const [name] = nameOrDotted.split('.');
    return this[name]
  }
}

class Provider {
  constructor (params = {}) {
    if (this.constructor === Provider) {
      throw new Error('Provider is an abstract base class.')
    }
    if (!('FOR_NODE_TYPES' in this)) {
      // FOR_NODE_TYPES must return a list of integers corresponding to the
      // node.nodeType's that the provider handles.
      throw new Error('Providers must have FOR_NODE_TYPES property')
    }
    this.bindingHandlers = params.bindingHandlers || new BindingHandlerObject();
    this.globals = params.globals || {};
  }

  nodeHasBindings (/* node */) {}
  getBindingAccessors (/* node, context */) {}
  preprocessNode (/* node */) {}
  postProcess (/* node */) {}
}

/**
 * BindingStringProvider is an abstract base class parses a binding string.
 *
 * Children must implement `nodeHasBindings` and `getBindingString`.
 */
class BindingStringProvider extends Provider {
  /** Call bindingHandler.preprocess on each respective binding string.
   *
   * The `preprocess` property of bindingHandler must be a static
   * function (i.e. on the object or constructor).
   */
  * processBinding (key, value) {
    // Get the "on" binding from "on.click"
    const [handlerName, property] = key.split('.');
    const handler = this.bindingHandlers.get(handlerName);

    if (handler && handler.preprocess) {
      const bindingsAddedByHandler = [];
      const chainFn = (...args) => bindingsAddedByHandler.push(args);
      value = handler.preprocess(value, key, chainFn);
      for (const [key, value] of bindingsAddedByHandler) {
        yield * this.processBinding(key, value);
      }
    } else if (property) {
      value = `{${property}:${value}}`;
    }

    yield `${handlerName}:${value}`;
  }

  * generateBindingString (bindingString) {
    for (const {key, unknown, value} of parseObjectLiteral(bindingString)) {
      yield * this.processBinding(key || unknown, value);
    }
  }

  preProcessBindings (bindingString) {
    return Array.from(this.generateBindingString(bindingString)).join(',')
  }

  getBindingAccessors (node, context) {
    const bindingString = node && this.getBindingString(node);
    if (!bindingString) { return }
    const processed = this.preProcessBindings(bindingString);
    return new Parser().parse(processed, context, this.globals, node)
  }

  getBindingString () { throw new Error('Overload getBindingString.') }
}

class VirtualProvider extends BindingStringProvider {
  get FOR_NODE_TYPES () { return [document.COMMENT_NODE] }

  getBindingString (node) {
    if (node.nodeType === document.COMMENT_NODE) {
      return virtualNodeBindingValue(node)
    }
  }

  nodeHasBindings (node) {
    if (node.nodeType === document.COMMENT_NODE) {
      return isStartComment(node)
    }
  }
}

class DataBindProvider extends BindingStringProvider {
  get FOR_NODE_TYPES () { return [document.ELEMENT_NODE] }

  get BIND_ATTRIBUTE () {
    return 'data-bind'
  }

  getBindingString (node) {
    if (node.nodeType === document.ELEMENT_NODE) {
      return node.getAttribute(this.BIND_ATTRIBUTE)
    }
  }

  nodeHasBindings (node) {
    if (node.nodeType === document.ELEMENT_NODE) {
      return node.hasAttribute(this.BIND_ATTRIBUTE)
    }
  }
}

var loadingSubscribablesCache = {};
var loadedDefinitionsCache = {};    // Tracks component loads that have already completed

function loadComponentAndNotify(componentName, callback) {
    var _subscribable = getObjectOwnProperty(loadingSubscribablesCache, componentName),
        completedAsync;
    if (!_subscribable) {
        // It's not started loading yet. Start loading, and when it's done, move it to loadedDefinitionsCache.
        _subscribable = loadingSubscribablesCache[componentName] = new subscribable();
        _subscribable.subscribe(callback);

        beginLoadingComponent(componentName, function(definition, config) {
            var isSynchronousComponent = !!(config && config.synchronous);
            loadedDefinitionsCache[componentName] = { definition: definition, isSynchronousComponent: isSynchronousComponent };
            delete loadingSubscribablesCache[componentName];

            // For API consistency, all loads complete asynchronously. However we want to avoid
            // adding an extra task schedule if it's unnecessary (i.e., the completion is already
            // async).
            //
            // You can bypass the 'always asynchronous' feature by putting the synchronous:true
            // flag on your component configuration when you register it.
            if (completedAsync || isSynchronousComponent) {
                // Note that notifySubscribers ignores any dependencies read within the callback.
                // See comment in loaderRegistryBehaviors.js for reasoning
                _subscribable.notifySubscribers(definition);
            } else {
                schedule(function() {
                    _subscribable.notifySubscribers(definition);
                });
            }
        });
        completedAsync = true;
    } else {
        _subscribable.subscribe(callback);
    }
}

function beginLoadingComponent(componentName, callback) {
    getFirstResultFromLoaders('getConfig', [componentName], function(config) {
        if (config) {
            // We have a config, so now load its definition
            getFirstResultFromLoaders('loadComponent', [componentName, config], function(definition) {
                callback(definition, config);
            });
        } else {
            // The component has no config - it's unknown to all the loaders.
            // Note that this is not an error (e.g., a module loading error) - that would abort the
            // process and this callback would not run. For this callback to run, all loaders must
            // have confirmed they don't know about this component.
            callback(null, null);
        }
    });
}

function getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders) {
    // On the first call in the stack, start with the full set of loaders
    if (!candidateLoaders) {
        candidateLoaders = registry$1.loaders.slice(0); // Use a copy, because we'll be mutating this array
    }

    // Try the next candidate
    var currentCandidateLoader = candidateLoaders.shift();
    if (currentCandidateLoader) {
        var methodInstance = currentCandidateLoader[methodName];
        if (methodInstance) {
            var wasAborted = false,
                synchronousReturnValue = methodInstance.apply(currentCandidateLoader, argsExceptCallback.concat(function(result) {
                    if (wasAborted) {
                        callback(null);
                    } else if (result !== null) {
                        // This candidate returned a value. Use it.
                        callback(result);
                    } else {
                        // Try the next candidate
                        getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders);
                    }
                }));

            // Currently, loaders may not return anything synchronously. This leaves open the possibility
            // that we'll extend the API to support synchronous return values in the future. It won't be
            // a breaking change, because currently no loader is allowed to return anything except undefined.
            if (synchronousReturnValue !== undefined) {
                wasAborted = true;

                // Method to suppress exceptions will remain undocumented. This is only to keep
                // KO's specs running tidily, since we can observe the loading got aborted without
                // having exceptions cluttering up the console too.
                if (!currentCandidateLoader.suppressLoaderExceptions) {
                    throw new Error('Component loaders must supply values by invoking the callback, not by returning values synchronously.');
                }
            }
        } else {
            // This candidate doesn't have the relevant handler. Synchronously move on to the next one.
            getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders);
        }
    } else {
        // No candidates returned a value
        callback(null);
    }
}

var registry$1 = {
  get (componentName, callback) {
    var cachedDefinition = getObjectOwnProperty(loadedDefinitionsCache, componentName);
    if (cachedDefinition) {
      // It's already loaded and cached. Reuse the same definition object.
      // Note that for API consistency, even cache hits complete asynchronously by default.
      // You can bypass this by putting synchronous:true on your component config.
      if (cachedDefinition.isSynchronousComponent) {
        ignore(function() { // See comment in loaderRegistryBehaviors.js for reasoning
            callback(cachedDefinition.definition);
        });
      } else {
        schedule(function() { callback(cachedDefinition.definition); });
      }
    } else {
      // Join the loading process that is already underway, or start a new one.
      loadComponentAndNotify(componentName, callback);
    }
  },

  clearCachedDefinition (componentName) {
    delete loadedDefinitionsCache[componentName];
  },

  _getFirstResultFromLoaders: getFirstResultFromLoaders,

  loaders: []
};

// The default loader is responsible for two things:
// 1. Maintaining the default in-memory registry of component configuration objects
//    (i.e., the thing you're writing to when you call ko.components.register(someName, ...))
// 2. Answering requests for components by fetching configuration objects
//    from that default in-memory registry and resolving them into standard
//    component definition objects (of the form { createViewModel: ..., template: ... })
// Custom loaders may override either of these facilities, i.e.,
// 1. To supply configuration objects from some other source (e.g., conventions)
// 2. Or, to resolve configuration objects by loading viewmodels/templates via arbitrary logic.

var defaultConfigRegistry = {};

function register(componentName, config) {
    if (!config) {
        throw new Error('Invalid configuration for ' + componentName);
    }

    if (isRegistered(componentName)) {
        throw new Error('Component ' + componentName + ' is already registered');
    }

    defaultConfigRegistry[componentName] = config;
}

function isRegistered(componentName) {
    return defaultConfigRegistry.hasOwnProperty(componentName);
}

function unregister(componentName) {
    delete defaultConfigRegistry[componentName];
    registry$1.clearCachedDefinition(componentName);
}

var defaultLoader = {
    getConfig: function(componentName, callback) {
        var result = defaultConfigRegistry.hasOwnProperty(componentName)
            ? defaultConfigRegistry[componentName]
            : null;
        callback(result);
    },

    loadComponent: function(componentName, config, callback) {
        var errorCallback = makeErrorCallback(componentName);
        possiblyGetConfigFromAmd(errorCallback, config, function(loadedConfig) {
            resolveConfig(componentName, errorCallback, loadedConfig, callback);
        });
    },

    loadTemplate: function(componentName, templateConfig, callback) {
        resolveTemplate(makeErrorCallback(componentName), templateConfig, callback);
    },

    loadViewModel: function(componentName, viewModelConfig, callback) {
        resolveViewModel(makeErrorCallback(componentName), viewModelConfig, callback);
    }
};

var createViewModelKey = 'createViewModel';

// Takes a config object of the form { template: ..., viewModel: ... }, and asynchronously convert it
// into the standard component definition format:
//    { template: <ArrayOfDomNodes>, createViewModel: function(params, componentInfo) { ... } }.
// Since both template and viewModel may need to be resolved asynchronously, both tasks are performed
// in parallel, and the results joined when both are ready. We don't depend on any promises infrastructure,
// so this is implemented manually below.
function resolveConfig(componentName, errorCallback, config, callback) {
    var result = {},
        makeCallBackWhenZero = 2,
        tryIssueCallback = function() {
            if (--makeCallBackWhenZero === 0) {
                callback(result);
            }
        },
        templateConfig = config['template'],
        viewModelConfig = config['viewModel'];

    if (templateConfig) {
        possiblyGetConfigFromAmd(errorCallback, templateConfig, function(loadedConfig) {
            registry$1._getFirstResultFromLoaders('loadTemplate', [componentName, loadedConfig], function(resolvedTemplate) {
                result['template'] = resolvedTemplate;
                tryIssueCallback();
            });
        });
    } else {
        tryIssueCallback();
    }

    if (viewModelConfig) {
        possiblyGetConfigFromAmd(errorCallback, viewModelConfig, function(loadedConfig) {
            registry$1._getFirstResultFromLoaders('loadViewModel', [componentName, loadedConfig], function(resolvedViewModel) {
                result[createViewModelKey] = resolvedViewModel;
                tryIssueCallback();
            });
        });
    } else {
        tryIssueCallback();
    }
}

function resolveTemplate(errorCallback, templateConfig, callback) {
    if (typeof templateConfig === 'string') {
        // Markup - parse it
        callback(parseHtmlFragment(templateConfig));
    } else if (templateConfig instanceof Array) {
        // Assume already an array of DOM nodes - pass through unchanged
        callback(templateConfig);
    } else if (isDocumentFragment(templateConfig)) {
        // Document fragment - use its child nodes
        callback(makeArray(templateConfig.childNodes));
    } else if (templateConfig['element']) {
        var element = templateConfig['element'];
        if (isDomElement(element)) {
            // Element instance - copy its child nodes
            callback(cloneNodesFromTemplateSourceElement(element));
        } else if (typeof element === 'string') {
            // Element ID - find it, then copy its child nodes
            var elemInstance = document.getElementById(element);
            if (elemInstance) {
                callback(cloneNodesFromTemplateSourceElement(elemInstance));
            } else {
                errorCallback('Cannot find element with ID ' + element);
            }
        } else {
            errorCallback('Unknown element type: ' + element);
        }
    } else {
        errorCallback('Unknown template value: ' + templateConfig);
    }
}

function resolveViewModel(errorCallback, viewModelConfig, callback) {
    if (typeof viewModelConfig === 'function') {
        // Constructor - convert to standard factory function format
        // By design, this does *not* supply componentInfo to the constructor, as the intent is that
        // componentInfo contains non-viewmodel data (e.g., the component's element) that should only
        // be used in factory functions, not viewmodel constructors.
        callback(function (params /*, componentInfo */) {
            return new viewModelConfig(params);
        });
    } else if (typeof viewModelConfig[createViewModelKey] === 'function') {
        // Already a factory function - use it as-is
        callback(viewModelConfig[createViewModelKey]);
    } else if ('instance' in viewModelConfig) {
        // Fixed object instance - promote to createViewModel format for API consistency
        var fixedInstance = viewModelConfig['instance'];
        callback(function (/* params, componentInfo */) {
            return fixedInstance;
        });
    } else if ('viewModel' in viewModelConfig) {
        // Resolved AMD module whose value is of the form { viewModel: ... }
        resolveViewModel(errorCallback, viewModelConfig['viewModel'], callback);
    } else {
        errorCallback('Unknown viewModel value: ' + viewModelConfig);
    }
}

function cloneNodesFromTemplateSourceElement(elemInstance) {
    switch (tagNameLower(elemInstance)) {
    case 'script':
        return parseHtmlFragment(elemInstance.text);
    case 'textarea':
        return parseHtmlFragment(elemInstance.value);
    case 'template':
        // For browsers with proper <template> element support (i.e., where the .content property
        // gives a document fragment), use that document fragment.
        if (isDocumentFragment(elemInstance.content)) {
            return cloneNodes(elemInstance.content.childNodes);
        }
    }

    // Regular elements such as <div>, and <template> elements on old browsers that don't really
    // understand <template> and just treat it as a regular container
    return cloneNodes(elemInstance.childNodes);
}


function possiblyGetConfigFromAmd(errorCallback, config, callback) {
    if (typeof config.require === 'string') {
        // The config is the value of an AMD module
        if (window.amdRequire || window.require) {
            (window.amdRequire || window.require)([config.require], callback);
        } else {
            errorCallback('Uses require, but no AMD loader is present');
        }
    } else {
        callback(config);
    }
}

function makeErrorCallback(componentName) {
    return function (message) {
        throw new Error('Component \'' + componentName + '\': ' + message);
    };
}


// By default, the default loader is the only registered component loader
registry$1.loaders.push(defaultLoader);

var registry = {
  // -- Registry --
  get: registry$1.get,
  clearCachedDefinition: registry$1.clearCachedDefinition,

  // -- Loader --
  register,
  isRegistered,
  unregister,
  defaultLoader,
  // "Privately" expose the underlying config registry for use in old-IE shim
  _allRegisteredComponents: defaultConfigRegistry,

  get loaders () { return registry$1.loaders },
  set loaders (loaders) { registry$1.loaders = loaders; }
};

class ComponentProvider extends Provider {
  get FOR_NODE_TYPES () { return [document.ELEMENT_NODE] }

  nodeHasBindings (node) {
    return Boolean(this.getComponentNameForNode(node))
  }

  getBindingAccessors (node, context) {
    const componentName = this.getComponentNameForNode(node);
    if (!componentName) { return }
    const component = () => ({
      name: componentName,
      params: this.getComponentParams(node, context)
    });
    return { component }
  }

  getComponentNameForNode (node) {
    if (node.nodeType !== node.ELEMENT_NODE) { return }
    const tagName = tagNameLower(node);
    if (registry.isRegistered(tagName)) {
      const hasDash = tagName.includes('-');
      const isUnknownEntity = ('' + node) === '[object HTMLUnknownElement]';
      if (hasDash || isUnknownEntity) { return tagName }
    }
  }

  getComponentParams (node, context) {
    const parser = new Parser(node, context, this.globals);
    const paramsString = (node.getAttribute('params') || '').trim();
    const accessors = parser.parse(paramsString, context, node);
    if (!accessors || Object.keys(accessors).length === 0) {
      return { $raw: {} }
    }
    const $raw = objectMap(accessors,
      (value) => computed(value, null, { disposeWhenNodeIsRemoved: node })
    );
    const params = objectMap($raw, (v) => this.makeParamValue(node, v));
    return Object.assign({ $raw }, params)
  }

  makeParamValue (node, paramValueComputed) {
    const paramValue = paramValueComputed.peek();
    // Does the evaluation of the parameter value unwrap any observables?
    if (!paramValueComputed.isActive()) {
      // No it doesn't, so there's no need for any computed wrapper. Just pass through the supplied value directly.
      // Example: "someVal: firstName, age: 123" (whether or not firstName is an observable/computed)
      return paramValue
    }
    // Yes it does. Supply a computed property that unwraps both the outer (binding expression)
    // level of observability, and any inner (resulting model value) level of observability.
    // This means the component doesn't have to worry about multiple unwrapping. If the value is a
    // writable observable, the computed will also be writable and pass the value on to the observable.
    const isWriteable = isWriteableObservable(paramValue);

    return computed({
      read: () => unwrap(paramValueComputed()),
      write: isWriteable ? (v) => paramValueComputed()(v) : null,
      disposeWhenNodeIsRemoved: node
    })
  }
}

/**
 * Convert attributes with ko-* to bindings.
 *
 * e.g.
 * <div ko-visible='value'></div>
 */
class AttrProvider extends Provider {
  get FOR_NODE_TYPES () { return [document.ELEMENT_NODE] }

  get PREFIX () { return 'ko-' }

  getBindingAttributesList (node) {
    if (!node.hasAttributes()) { return [] }
    return Array.from(node.attributes)
      .filter(attr => attr.name.startsWith(this.PREFIX))
  }

  nodeHasBindings (node) {
    return this.getBindingAttributesList(node).length > 0
  }

  getBindingAccessors (node, context) {
    return Object.assign({}, ...this.handlersFromAttributes(node, context))
  }

  * handlersFromAttributes (node, context) {
    for (const attr of this.getBindingAttributesList(node)) {
      const name = attr.name.substr(this.PREFIX.length);
      yield {[name]: () => this.getValue(attr.value, context, node)};
    }
  }

  getValue (token, $context, node) {
    /* FIXME: This duplicates Identifier.prototype.lookup_value; it should
       be refactored into e.g. a BindingContext method */
    if (!token) { return }
    const $data = $context.$data;

    switch (token) {
      case '$element': return node
      case '$context': return $context
      case 'this': case '$data': return $context.$data
    }

    if ($data instanceof Object && token in $data) { return $data[token] }
    if (token in $context) { return $context[token] }
    if (token in this.globals) { return this.globals[token] }

    throw new Error(`The variable '${token} not found.`)
  }
}

class MultiProvider extends Provider {
  get FOR_NODE_TYPES () { return this.nodeTypes }

  constructor (params = {}) {
    super(params);
    const providers = params.providers || [];
    this.nodeTypeMap = {};
    this.nodeTypes = [];
    this.providers = [];
    providers.forEach(p => this.addProvider(p));
  }

  addProvider (provider) {
    this.providers.push(provider);
    provider.bindingHandlers = this.bindingHandlers;
    provider.globals = this.globals;
    const nodeTypeMap = this.nodeTypeMap;
    for (const nodeType of provider.FOR_NODE_TYPES) {
      if (!nodeTypeMap[nodeType]) { nodeTypeMap[nodeType] = []; }
      nodeTypeMap[nodeType].push(provider);
    }
    this.nodeTypes = Object.keys(this.nodeTypeMap).map(k => parseInt(k, 10));
  }

  providersFor (node) {
    return this.nodeTypeMap[node.nodeType] || []
  }

  nodeHasBindings (node) {
    return this.providersFor(node).some(p => p.nodeHasBindings(node))
  }

  preprocessNode (node) {
    for (const provider of this.providersFor(node)) {
      const newNodes = provider.preprocessNode(node);
      if (newNodes) { return newNodes }
    }
  }

  * enumerateProviderBindings (node, ctx) {
    for (const provider of this.providersFor(node)) {
      const bindings = provider.getBindingAccessors(node, ctx) || {};
      for (const [key, accessor] of Object.entries(bindings || {})) {
        yield [key, accessor];
      }
    }
  }

  getBindingAccessors (node, ctx) {
    node = this.preprocessNode(node) || node;
    const bindings = {};
    for (const [key, accessor] of this.enumerateProviderBindings(node, ctx)) {
      if (key in bindings) {
        throw new Error(`The binding "${key}" is duplicated by multiple providers`)
      }
      bindings[key] = accessor;
    }
    return bindings
  }
}

const INNER_EXPRESSION = /^([\s\S]*)}}([\s\S]*?)\{\{([\s\S]*)$/;
const OUTER_EXPRESSION = /^([\s\S]*?)\{\{([\s\S]*)}}([\s\S]*)$/;
const BINDING_EXPRESSION = /^([^,"'{}()/:[\]\s]+)\s+([^\s:].*)/;

class Interpolated {
  constructor (text) {
    this.text = text;
  }

  trim (string) {
    return string === null ? '' : string.trim()
  }
}

class Expression$1 extends Interpolated {
  asAttr (context, globals, node) {
    return new Parser().parseExpression(this.text, context, globals, node)()
  }

  * textNodeReplacement (textNode) {
    const text = this.trim(this.text);
    const ownerDocument = textNode ? textNode.ownerDocument : document;
    const firstChar = text[0];
    const lastChar = text[text.length - 1];
    var closeComment = true;
    var binding;

    if (firstChar === '#') {
      if (lastChar === '/') {
        binding = text.slice(1, -1);
      } else {
        binding = text.slice(1);
        closeComment = false;
      }
      const matches = binding.match(BINDING_EXPRESSION);
      if (matches) {
        binding = matches[1] + ':' + matches[2];
      }
    } else if (firstChar === '/') {
      // replace only with a closing comment
    } else if (firstChar === '{' && lastChar === '}') {
      binding = 'html:' + this.trim(text.slice(1, -1));
    } else {
      binding = 'text:' + this.trim(text);
    }

    if (binding) {
      yield ownerDocument.createComment('ko ' + binding);
    }
    if (closeComment) {
      yield ownerDocument.createComment('/ko');
    }
  }
}

class Text extends Interpolated {
  asAttr () { return this.text }

  * textNodeReplacement () {
    yield document.createTextNode(this.text.replace(/"/g, '\\"'));
  }
}

/**
 *          Interpolation Parsing
 */
function * innerParse (text) {
  const innerMatch = text.match(INNER_EXPRESSION);
  if (innerMatch) {
    const [pre, inner, post] = innerMatch.slice(1);
    yield * innerParse(pre);
    yield new Text(inner);
    yield new Expression$1(post);
  } else {
    yield new Expression$1(text);
  }
}

function * parseOuterMatch (outerMatch) {
  if (!outerMatch) { return }
  let [pre, inner, post] = outerMatch.slice(1);
  yield new Text(pre);
  yield * innerParse(inner);
  yield new Text(post);
}

function * parseInterpolation (text) {
  for (const textOrExpr of parseOuterMatch(text.match(OUTER_EXPRESSION))) {
    if (textOrExpr.text) { yield textOrExpr; }
  }
}

/**
 * These are bindings that are mapped specific attributes, such as
 * two-way communication (value/checked) or which have anti-collision
 * properties (css).
 */
const DEFAULT_ATTRIBUTE_BINDING_MAP = {
  value: 'value',
  checked: 'checked',
  class: 'css'
};

/**
 *  Interpret {{ }} inside DOM attributes e.g. <div class='{{ classes }}'>
 */
class AttributeMustacheProvider extends Provider {
  get FOR_NODE_TYPES () { return [document.ELEMENT_NODE] }

  constructor (params = {}) {
    super(params);
    this.ATTRIBUTES_TO_SKIP = new Set(params.attributesToSkip || ['data-bind']);
    this.ATTRIBUTES_BINDING_MAP = params.attributesBindingMap || DEFAULT_ATTRIBUTE_BINDING_MAP;
  }

  * attributesToInterpolate (attributes) {
    for (const attr of Array.from(attributes)) {
      if (this.ATTRIBUTES_TO_SKIP.has(attr.name)) { continue }
      if (attr.specified && attr.value.includes('{{')) { yield attr; }
    }
  }

  nodeHasBindings (node) {
    return !this.attributesToInterpolate(node.attributes).next().done
  }

  partsTogether (parts, context, node, ...valueToWrite) {
    if (parts.length > 1) {
      return parts
        .map(p => unwrap(p.asAttr(context, this.globals, node))).join('')
    }
    // It may be a writeable observable e.g. value="{{ value }}".
    const part = parts[0].asAttr(context, this.globals);
    if (valueToWrite.length) { part(valueToWrite[0]); }
    return part
  }

  attributeBinding (name, parts) {
    return [name, parts]
  }

  * bindingParts (node, context) {
    for (const attr of this.attributesToInterpolate(node.attributes)) {
      const parts = Array.from(parseInterpolation(attr.value));
      if (parts.length) { yield this.attributeBinding(attr.name, parts); }
    }
  }

  getPossibleDirectBinding (attrName) {
    const bindingName = this.ATTRIBUTES_BINDING_MAP[attrName];
    return bindingName && this.bindingHandlers.get(attrName)
  }

  * bindingObjects (node, context) {
    for (const [attrName, parts] of this.bindingParts(node, context)) {
      const bindingForAttribute = this.getPossibleDirectBinding(attrName);
      const handler = bindingForAttribute ? attrName : `attr.${attrName}`;
      const accessorFn = bindingForAttribute
        ? (...v) => this.partsTogether(parts, context, node, ...v)
        : (...v) => ({[attrName]: this.partsTogether(parts, context, node, ...v)});
      node.removeAttribute(attrName);
      yield { [handler]: accessorFn };
    }
  }

  getBindingAccessors (node, context) {
    return Object.assign({}, ...this.bindingObjects(node, context))
  }
}

/**
 * Interpret {{ }}, {{{ }}}, {{# /}}, and {{# }} ... {{/ }} inside text nodes.
 *
 * This binding must come before the VirtualProvider.
 */
class TextMustacheProvider extends Provider {
  get FOR_NODE_TYPES () { return [document.TEXT_NODE] }

  * textToNodes (textNode) {
    const parent = textNode.parentNode;
    const isTextarea = parent && parent.nodeName === 'TEXTAREA';
    const hasStash = textNode.nodeValue && textNode.nodeValue.includes('{{');

    if (!hasStash || isTextarea) { return }

    for (const part of parseInterpolation(textNode.nodeValue)) {
      yield * part.textNodeReplacement(textNode);
    }
  }

  textInterpolation (textNode) {
    const newNodes = Array.from(this.textToNodes(textNode));

    if (newNodes.length === 0) { return }

    if (textNode.parentNode) {
      const parent = textNode.parentNode;
      const n = newNodes.length;
      for (let i = 0; i < n; ++i) {
        parent.insertBefore(newNodes[i], textNode);
      }
      parent.removeChild(textNode);
    }

    return newNodes
  }

  /**
   * We convert as follows:
   *
   *   {{# ... }} into <!-- ko ... -->
   *   {{/ ... }} into <!-- /ko -->
   *   {{# ... /}} into <!-- ko ... --><!-- /ko -->
   *   {{ ... }} into <!-- ko text: ... --><!-- /ko -->
   *   {{{ ... }}} into <!-- ko html: ... --><!-- /ko -->
   *
   * VirtualProvider can then pick up and do the actual binding.
   */
  preprocessNode (node) {
    return this.textInterpolation(node)
  }
}

var storedBindingContextDomDataKey = nextKey();



// The bindingContext constructor is only called directly to create the root context. For child
// contexts, use bindingContext.createChildContext or bindingContext.extend.
function bindingContext(dataItemOrAccessor, parentContext, dataItemAlias, extendCallback, settings) {

    var self = this,
        isFunc = typeof(dataItemOrAccessor) == "function" && !isObservable(dataItemOrAccessor),
        nodes,
        subscribable$$1;

    // The binding context object includes static properties for the current, parent, and root view models.
    // If a view model is actually stored in an observable, the corresponding binding context object, and
    // any child contexts, must be updated when the view model is changed.
    function updateContext() {
        // Most of the time, the context will directly get a view model object, but if a function is given,
        // we call the function to retrieve the view model. If the function accesses any observables or returns
        // an observable, the dependency is tracked, and those observables can later cause the binding
        // context to be updated.
        var dataItemOrObservable = isFunc ? dataItemOrAccessor() : dataItemOrAccessor,
            dataItem = unwrap(dataItemOrObservable);

        if (parentContext) {
            // When a "parent" context is given, register a dependency on the parent context. Thus whenever the
            // parent context is updated, this context will also be updated.
            if (parentContext._subscribable)
                parentContext._subscribable();

            // Copy $root and any custom properties from the parent context
            extend(self, parentContext);

            // Because the above copy overwrites our own properties, we need to reset them.
            self._subscribable = subscribable$$1;
        } else {
            self.$parents = [];
            self.$root = dataItem;

            // Export 'ko' in the binding context so it will be available in bindings and templates
            // even if 'ko' isn't exported as a global, such as when using an AMD loader.
            // See https://github.com/SteveSanderson/knockout/issues/490
            self.ko = options.knockoutInstance;
        }
        self.$rawData = dataItemOrObservable;
        self.$data = dataItem;
        if (dataItemAlias)
            self[dataItemAlias] = dataItem;

        // The extendCallback function is provided when creating a child context or extending a context.
        // It handles the specific actions needed to finish setting up the binding context. Actions in this
        // function could also add dependencies to this binding context.
        if (extendCallback)
            extendCallback(self, parentContext, dataItem);

        return self.$data;
    }

    function disposeWhen() {
        return nodes && !anyDomNodeIsAttachedToDocument(nodes);
    }

    if (settings && settings.exportDependencies) {
        // The "exportDependencies" option means that the calling code will track any dependencies and re-create
        // the binding context when they change.
        updateContext();
        return;
    }

    subscribable$$1 = computed(updateContext, null, { disposeWhen: disposeWhen, disposeWhenNodeIsRemoved: true });

    // At this point, the binding context has been initialized, and the "subscribable" computed observable is
    // subscribed to any observables that were accessed in the process. If there is nothing to track, the
    // computed will be inactive, and we can safely throw it away. If it's active, the computed is stored in
    // the context object.
    if (subscribable$$1.isActive()) {
        self._subscribable = subscribable$$1;

        // Always notify because even if the model ($data) hasn't changed, other context properties might have changed
        subscribable$$1.equalityComparer = null;

        // We need to be able to dispose of this computed observable when it's no longer needed. This would be
        // easy if we had a single node to watch, but binding contexts can be used by many different nodes, and
        // we cannot assume that those nodes have any relation to each other. So instead we track any node that
        // the context is attached to, and dispose the computed when all of those nodes have been cleaned.

        // Add properties to *subscribable* instead of *self* because any properties added to *self* may be overwritten on updates
        nodes = [];
        subscribable$$1._addNode = function(node) {
            nodes.push(node);
            addDisposeCallback(node, function(node) {
                arrayRemoveItem(nodes, node);
                if (!nodes.length) {
                    subscribable$$1.dispose();
                    self._subscribable = subscribable$$1 = undefined;
                }
            });
        };
    }
}

bindingContext.prototype.lookup = function (token, globals, node) {
  // short circuits
  switch (token) {
    case '$element': return node
    case '$context': return this
    case 'this': case '$data': return this.$data
  }
  const $data = this.$data;
  // instanceof Object covers 1. {}, 2. [], 3. function() {}, 4. new *;  it excludes undefined, null, primitives.
  if ($data instanceof Object && token in $data) { return $data[token] }
  if (token in this) { return this[token] }
  if (token in globals) { return globals[token] }

  throw new Error(`The variable "${token}" was not found on $data, $context, or globals.`)
};

// Extend the binding context hierarchy with a new view model object. If the parent context is watching
// any observables, the new child context will automatically get a dependency on the parent context.
// But this does not mean that the $data value of the child context will also get updated. If the child
// view model also depends on the parent view model, you must provide a function that returns the correct
// view model on each update.
bindingContext.prototype.createChildContext = function (dataItemOrAccessor, dataItemAlias, extendCallback, settings) {
    return new bindingContext(dataItemOrAccessor, this, dataItemAlias, function(self, parentContext) {
        // Extend the context hierarchy by setting the appropriate pointers
        self.$parentContext = parentContext;
        self.$parent = parentContext.$data;
        self.$parents = (parentContext.$parents || []).slice(0);
        self.$parents.unshift(self.$parent);
        if (extendCallback)
            extendCallback(self);
    }, settings);
};

// Extend the binding context with new custom properties. This doesn't change the context hierarchy.
// Similarly to "child" contexts, provide a function here to make sure that the correct values are set
// when an observable view model is updated.
bindingContext.prototype.extend = function(properties) {
    // If the parent context references an observable view model, "_subscribable" will always be the
    // latest view model object. If not, "_subscribable" isn't set, and we can use the static "$data" value.
    return new bindingContext(this._subscribable || this.$data, this, null, function(self, parentContext) {
        // This "child" context doesn't directly track a parent observable view model,
        // so we need to manually set the $rawData value to match the parent.
        self.$rawData = parentContext.$rawData;
        extend(self, typeof(properties) === "function" ? properties() : properties);
    });
};

bindingContext.prototype.createStaticChildContext = function (dataItemOrAccessor, dataItemAlias) {
    return this.createChildContext(dataItemOrAccessor, dataItemAlias, null, { "exportDependencies": true });
};


function storedBindingContextForNode(node, bindingContext) {
    if (arguments.length == 2) {
        set(node, storedBindingContextDomDataKey, bindingContext);
        if (bindingContext._subscribable)
            bindingContext._subscribable._addNode(node);
    } else {
        return get(node, storedBindingContextDomDataKey);
    }
}


// Retrieving binding context from arbitrary nodes
function contextFor(node) {
    // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
    switch (node.nodeType) {
    case 1:
    case 8:
        var context = storedBindingContextForNode(node);
        if (context) return context;
        if (node.parentNode) return contextFor(node.parentNode);
        break;
    }
    return undefined;
}


function dataFor(node) {
    var context = contextFor(node);
    return context ? context.$data : undefined;
}

const SUBSCRIPTIONS = createSymbolOrString('LifeCycle Subscriptions List');
const ANCHOR_NODE = createSymbolOrString('LifeCycle Anchor Node');

class LifeCycle {
  // NOTE: For more advanced integration as an ES6 mixin, see e.g.:
  // http://justinfagnani.com/2015/12/21/real-mixins-with-javascript-classes/

  /**
   * Copy the properties of the LifeCycle class to the target (or its prototype)
   *
   * NOTE: getOwnPropertyNames is needed to copy the non-enumerable properties.
   */
  static mixInto (Constructor) {
    const target = Constructor.prototype || Constructor;
    const mixin = LifeCycle.prototype;
    for (let prop of Object.getOwnPropertyNames(mixin)) {
      target[prop] = mixin[prop];
    }
  }

  subscribe (observable, action) {
    if (typeof action === 'string') { action = this[action].bind(this); }
    this.addDisposable(observable.subscribe(action));
  }

  computed (params) {
    if (typeof params === 'string') {
      params = { read: this[params], write: this[params], owner: this };
    } else if (typeof params === 'object') {
      // Pass directly.
    } else if (typeof params === 'function') {
      params = { read: params, write: params };
    } else {
      throw new Error('LifeCycle::computed not given a valid type.')
    }

    params.disposeWhenNodeIsRemoved = this[ANCHOR_NODE];
    return this.addDisposable(computed(params))
  }

  addEventListener (...args) {
    const node = args[0].nodeType ? args.shift() : this[ANCHOR_NODE];
    const [type, act, options$$1] = args;
    const handler = typeof act === 'string' ? this[act].bind(this) : act;
    this.__addEventListener(node, type, handler, options$$1);
  }

  __addEventListener (node, eventType, handler, options$$1) {
    node.addEventListener(eventType, handler, options$$1);
    function dispose () { node.removeEventListener(eventType, handler); }
    addDisposeCallback(node, dispose);
    this.addDisposable({ dispose });
  }

  anchorTo (node) {
    addDisposeCallback(node, () => this.dispose());
    this[ANCHOR_NODE] = node;
  }

  dispose () {
    const subscriptions = this[SUBSCRIPTIONS] || [];
    subscriptions.forEach(s => s.dispose());
    this[SUBSCRIPTIONS] = [];
    this[ANCHOR_NODE] = null;
  }

  addDisposable (subscription) {
    const subscriptions = this[SUBSCRIPTIONS] || [];
    if (!this[SUBSCRIPTIONS]) { this[SUBSCRIPTIONS] = subscriptions; }
    if (typeof subscription.dispose !== 'function') {
      throw new Error('Lifecycle::addDisposable argument missing `dispose`.')
    }
    subscriptions.push(subscription);
    return subscription
  }
}

class BindingHandler extends LifeCycle {
  constructor (params) {
    super();
    const {$element, valueAccessor, allBindings, $context} = params;
    Object.assign(this, {
      valueAccessor,
      allBindings,
      $element,
      $context,
      $data: $context.$data
    });

    this.anchorTo($element);
  }

  get value () { return this.valueAccessor() }
  set value (v) { return this.valueAccessor(v) }

  get controlsDescendants () { return false }

  static get allowVirtualElements () { return false }
  static get isBindingHandlerClass () { return true }

  /* Overload this for asynchronous bindings or bindings that recursively
     apply bindings (e.g. components, foreach, template).

     A binding should be complete when it has run through once, notably
     in server-side bindings for pre-rendering.
  */
  get bindingCompleted () { return true }

  static registerAs (name, provider = options.bindingProviderInstance) {
    provider.bindingHandlers.set(name, this);
  }
}

/**
 * An AsyncBindingHandler shall call `completeBinding` when the binding
 * is to be considered complete.
 */
class AsyncBindingHandler extends BindingHandler {
  constructor (params) {
    super(params);
    this.bindingCompletion = new options.Promise((resolve) => { this.completeBinding = resolve; });
  }

  get bindingCompleted () { return this.bindingCompletion }
}

/**
 * We have no guarantees, for users employing legacy bindings,
 * that it has not been changed with a modification like
 *
 *    ko.bindingHandlers[name] = { init: ...}
 *
 * ... so we have to keep track by way of a map.
 */
const PossibleWeakMap = window.WeakMap || Map;
const legacyBindingMap = new PossibleWeakMap();

class LegacyBindingHandler extends BindingHandler {
  constructor (params) {
    super(params);
    const handler = this.handler;

    if (typeof handler.dispose === 'function') {
      this.addDisposable(handler);
    }

    try {
      this.initReturn = handler.init && handler.init(...this.legacyArgs);
    } catch (e) { params.onError('init', e); }

    if (typeof handler.update === 'function') {
      this.computed(() => {
        try {
          handler.update(...this.legacyArgs);
        } catch (e) {
          params.onError('update', e);
        }
      });
    }
  }

  get legacyArgs () {
    return [
      this.$element, this.valueAccessor, this.allBindings,
      this.$data, this.$context
    ]
  }

  get controlsDescendants () {
    const objectToTest = this.initReturn || this.handler || {};
    return objectToTest.controlsDescendantBindings
  }

  /**
   * Create a handler instance from the `origin`, which may be:
   *
   * 1. an object (becomes LegacyBindingHandler)
   * 2. a function (becomes LegacyBindingHandler with `init: function`)
   *
   * If given an object (the only kind supported in knockout 3.x and before), it
   * shall draw the `init`, `update`, and `allowVirtualElements` properties
   */
  static getOrCreateFor (key, handler) {
    if (legacyBindingMap.has(handler)) {
      return legacyBindingMap.get(handler)
    }
    const newLegacyHandler = this.createFor(key, handler);
    legacyBindingMap.set(handler, newLegacyHandler);
    return newLegacyHandler
  }

  static createFor (key, handler) {
    if (typeof handler === 'function') {
      const [initFn, disposeFn] = [handler, handler.dispose];
      return class extends LegacyBindingHandler {
        get handler () {
          const init = initFn.bind(this);
          const dispose = disposeFn ? disposeFn.bind(this) : null;
          return { init, dispose }
        }
        static get after () { return handler.after }
        static get allowVirtualElements () {
          return handler.allowVirtualElements || allowedBindings[key]
        }
      }
    }

    if (typeof handler === 'object') {
      return class extends LegacyBindingHandler {
        get handler () { return handler }
        static get after () { return handler.after }
        static get allowVirtualElements () {
          return handler.allowVirtualElements || allowedBindings[key]
        }
      }
    }

    throw new Error('The given handler is not an appropriate type.')
  }
}

/* eslint no-cond-assign: 0 */

// The following element types will not be recursed into during binding.
var bindingDoesNotRecurseIntoElementTypes = {
    // Don't want bindings that operate on text nodes to mutate <script> and <textarea> contents,
    // because it's unexpected and a potential XSS issue.
    // Also bindings should not operate on <template> elements since this breaks in Internet Explorer
    // and because such elements' contents are always intended to be bound in a different context
    // from where they appear in the document.
  'script': true,
  'textarea': true,
  'template': true
};

// Use an overridable method for retrieving binding handlers so that a plugins may support dynamically created handlers
function getBindingHandler (bindingKey) {
  const handler = options.bindingProviderInstance.bindingHandlers.get(bindingKey);
  if (!handler) { return }
  if (handler.isBindingHandlerClass) { return handler }
  return LegacyBindingHandler.getOrCreateFor(bindingKey, handler)
}

// Returns the valueAccesor function for a binding value
function makeValueAccessor (value) {
  return function () {
    return value
  }
}

// Returns the value of a valueAccessor function
function evaluateValueAccessor (valueAccessor) {
  return valueAccessor()
}

// Given a function that returns bindings, create and return a new object that contains
// binding value-accessors functions. Each accessor function calls the original function
// so that it always gets the latest value and all dependencies are captured. This is used
// by ko.applyBindingsToNode and getBindingsAndMakeAccessors.
function makeAccessorsFromFunction (callback) {
  return objectMap(ignore(callback), function (value, key) {
    return function () {
      return callback()[key]
    }
  })
}

// Given a bindings function or object, create and return a new object that contains
// binding value-accessors functions. This is used by ko.applyBindingsToNode.
function makeBindingAccessors (bindings, context, node) {
  if (typeof bindings === 'function') {
    return makeAccessorsFromFunction(bindings.bind(null, context, node))
  } else {
    return objectMap(bindings, makeValueAccessor)
  }
}

// This function is used if the binding provider doesn't include a getBindingAccessors function.
// It must be called with 'this' set to the provider instance.
function getBindingsAndMakeAccessors (node, context) {
  return makeAccessorsFromFunction(this.getBindings.bind(this, node, context))
}

function applyBindingsToDescendantsInternal (bindingContext$$1, elementOrVirtualElement, bindingContextsMayDifferFromDomParentElement, asyncBindingsApplied) {
  var currentChild;
  var nextInQueue = firstChild(elementOrVirtualElement);
  const provider = options.bindingProviderInstance;
  const preprocessNode = provider.preprocessNode;

    // Preprocessing allows a binding provider to mutate a node before bindings are applied to it. For example it's
    // possible to insert new siblings after it, and/or replace the node with a different one. This can be used to
    // implement custom binding syntaxes, such as {{ value }} for string interpolation, or custom element types that
    // trigger insertion of <template> contents at that point in the document.
  if (preprocessNode) {
    while (currentChild = nextInQueue) {
      nextInQueue = nextSibling(currentChild);
      preprocessNode.call(provider, currentChild);
    }
        // Reset nextInQueue for the next loop
    nextInQueue = firstChild(elementOrVirtualElement);
  }

  while (currentChild = nextInQueue) {
        // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
    nextInQueue = nextSibling(currentChild);
    applyBindingsToNodeAndDescendantsInternal(bindingContext$$1, currentChild, bindingContextsMayDifferFromDomParentElement, asyncBindingsApplied);
  }
}

function hasBindings (node) {
  const provider = options.bindingProviderInstance;
  return provider.FOR_NODE_TYPES.includes(node.nodeType) && provider.nodeHasBindings(node)
}

function applyBindingsToNodeAndDescendantsInternal (bindingContext$$1, nodeVerified, bindingContextMayDifferFromDomParentElement, asyncBindingsApplied) {
  // Perf optimisation: Apply bindings only if...
  // (1) We need to store the binding context on this node (because it may differ from the DOM parent node's binding context)
  //     Note that we can't store binding contexts on non-elements (e.g., text nodes), as IE doesn't allow expando properties for those
  // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
  var isElement = nodeVerified.nodeType === 1;
  if (isElement) { // Workaround IE <= 8 HTML parsing weirdness
    normaliseVirtualElementDomStructure(nodeVerified);
  }

  var shouldApplyBindings = (isElement && bindingContextMayDifferFromDomParentElement) || // Case (1)
                             hasBindings(nodeVerified); // Case (2)

  const {shouldBindDescendants} = shouldApplyBindings
    ? applyBindingsToNodeInternal(nodeVerified, null, bindingContext$$1, bindingContextMayDifferFromDomParentElement, asyncBindingsApplied)
    : { shouldBindDescendants: true };

  if (shouldBindDescendants && !bindingDoesNotRecurseIntoElementTypes[tagNameLower(nodeVerified)]) {
    // We're recursing automatically into (real or virtual) child nodes without changing binding contexts. So,
    //  * For children of a *real* element, the binding context is certainly the same as on their DOM .parentNode,
    //    hence bindingContextsMayDifferFromDomParentElement is false
    //  * For children of a *virtual* element, we can't be sure. Evaluating .parentNode on those children may
    //    skip over any number of intermediate virtual elements, any of which might define a custom binding context,
    //    hence bindingContextsMayDifferFromDomParentElement is true
    applyBindingsToDescendantsInternal(bindingContext$$1, nodeVerified, /* bindingContextsMayDifferFromDomParentElement: */ !isElement, asyncBindingsApplied);
  }
}

var boundElementDomDataKey = nextKey();

function * topologicalSortBindings (bindings) {
  const results = [];
  // Depth-first sort
  const bindingsConsidered = {};    // A temporary record of which bindings are already in 'result'
  const cyclicDependencyStack = []; // Keeps track of a depth-search so that, if there's a cycle, we know which bindings caused it

  objectForEach(bindings, function pushBinding (bindingKey) {
    if (!bindingsConsidered[bindingKey]) {
      const binding = getBindingHandler(bindingKey);
      if (!binding) { return }
        // First add dependencies (if any) of the current binding
      if (binding.after) {
        cyclicDependencyStack.push(bindingKey);
        arrayForEach(binding.after, function (bindingDependencyKey) {
          if (!bindings[bindingDependencyKey]) { return }
          if (arrayIndexOf(cyclicDependencyStack, bindingDependencyKey) !== -1) {
            throw Error('Cannot combine the following bindings, because they have a cyclic dependency: ' + cyclicDependencyStack.join(', '))
          } else {
            pushBinding(bindingDependencyKey);
          }
        });
        cyclicDependencyStack.length--;
      }
        // Next add the current binding
      results.push([ bindingKey, binding ]);
    }
    bindingsConsidered[bindingKey] = true;
  });

  for (const result of results) { yield result; }
}

function applyBindingsToNodeInternal (node, sourceBindings, bindingContext$$1, bindingContextMayDifferFromDomParentElement, asyncBindingsApplied) {
    // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
  var alreadyBound = get(node, boundElementDomDataKey);
  if (!sourceBindings) {
    if (alreadyBound) {
      onBindingError({
        during: 'apply',
        errorCaptured: new Error('You cannot apply bindings multiple times to the same element.'),
        element: node,
        bindingContext: bindingContext$$1
      });
      return false
    }
    set(node, boundElementDomDataKey, true);
  }

    // Optimization: Don't store the binding context on this node if it's definitely the same as on node.parentNode, because
    // we can easily recover it just by scanning up the node's ancestors in the DOM
    // (note: here, parent node means "real DOM parent" not "virtual parent", as there's no O(1) way to find the virtual parent)
  if (!alreadyBound && bindingContextMayDifferFromDomParentElement) { storedBindingContextForNode(node, bindingContext$$1); }

    // Use bindings if given, otherwise fall back on asking the bindings provider to give us some bindings
  var bindings;
  if (sourceBindings && typeof sourceBindings !== 'function') {
    bindings = sourceBindings;
  } else {
    const provider = options.bindingProviderInstance;
    const getBindings = provider.getBindingAccessors || getBindingsAndMakeAccessors;

    if (provider.FOR_NODE_TYPES.includes(node.nodeType)) {
          // Get the binding from the provider within a computed observable so that we can update the bindings whenever
          // the binding context is updated or if the binding provider accesses observables.
      var bindingsUpdater = computed(
              function () {
                bindings = sourceBindings ? sourceBindings(bindingContext$$1, node) : getBindings.call(provider, node, bindingContext$$1);
                  // Register a dependency on the binding context to support observable view models.
                if (bindings && bindingContext$$1._subscribable) { bindingContext$$1._subscribable(); }
                return bindings
              },
              null, { disposeWhenNodeIsRemoved: node }
          );

      if (!bindings || !bindingsUpdater.isActive()) { bindingsUpdater = null; }
    }
  }

  var bindingHandlerThatControlsDescendantBindings;
  if (bindings) {
    const allBindingHandlers = {};
    set(node, 'bindingHandlers', allBindingHandlers);

        // Return the value accessor for a given binding. When bindings are static (won't be updated because of a binding
        // context update), just return the value accessor from the binding. Otherwise, return a function that always gets
        // the latest binding value and registers a dependency on the binding updater.
    const getValueAccessor = bindingsUpdater
            ? (bindingKey) => function (optionalValue) {
              var valueAccessor = bindingsUpdater()[bindingKey];
              if (arguments.length === 0) {
                return evaluateValueAccessor(valueAccessor)
              } else {
                return valueAccessor(optionalValue)
              }
            } : (bindingKey) => bindings[bindingKey];

        // Use of allBindings as a function is maintained for backwards compatibility, but its use is deprecated
    function allBindings () {
      return objectMap(bindingsUpdater ? bindingsUpdater() : bindings, evaluateValueAccessor)
    }
        // The following is the 3.x allBindings API
    allBindings.has = (key) => key in bindings;
    allBindings.get = (key) => bindings[key] && evaluateValueAccessor(getValueAccessor(key));

    for (const [key, BindingHandlerClass] of topologicalSortBindings(bindings)) {
        // Go through the sorted bindings, calling init and update for each
      function reportBindingError (during, errorCaptured) {
        onBindingError({
          during,
          errorCaptured,
          bindings,
          allBindings,
          bindingKey: key,
          bindingContext: bindingContext$$1,
          element: node,
          valueAccessor: getValueAccessor(key)
        });
      }

      if (node.nodeType === 8 && !BindingHandlerClass.allowVirtualElements) {
        throw new Error(`The binding [${key}] cannot be used with virtual elements`)
      }

      try {
        const bindingHandler = ignore(() =>
          new BindingHandlerClass({
            allBindings,
            $element: node,
            $context: bindingContext$$1,
            onError: reportBindingError,
            valueAccessor (...v) { return getValueAccessor(key)(...v) }
          })
        );

              // Expose the bindings via domData.
        allBindingHandlers[key] = bindingHandler;

        if (bindingHandler.controlsDescendants) {
          if (bindingHandlerThatControlsDescendantBindings !== undefined) { throw new Error('Multiple bindings (' + bindingHandlerThatControlsDescendantBindings + ' and ' + key + ') are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.') }
          bindingHandlerThatControlsDescendantBindings = key;
        }

        if (bindingHandler.bindingCompleted instanceof options.Promise) {
          asyncBindingsApplied.add(bindingHandler.bindingCompleted);
        }
      } catch (err) {
        reportBindingError('creation', err);
      }
    }
  }

  return {
    shouldBindDescendants: bindingHandlerThatControlsDescendantBindings === undefined
  }
}

function getBindingContext (viewModelOrBindingContext) {
  return viewModelOrBindingContext && (viewModelOrBindingContext instanceof bindingContext)
    ? viewModelOrBindingContext
    : new bindingContext(viewModelOrBindingContext)
}

function applyBindingAccessorsToNode (node, bindings, viewModelOrBindingContext, asyncBindingsApplied) {
  if (node.nodeType === 1) { // If it's an element, workaround IE <= 8 HTML parsing weirdness
    normaliseVirtualElementDomStructure(node);
  }
  return applyBindingsToNodeInternal(node, bindings, getBindingContext(viewModelOrBindingContext), true, asyncBindingsApplied)
}

function applyBindingsToNode (node, bindings, viewModelOrBindingContext) {
  const asyncBindingsApplied = new Set();
  var context = getBindingContext(viewModelOrBindingContext);
  applyBindingAccessorsToNode(node, makeBindingAccessors(bindings, context, node), context, asyncBindingsApplied);
  return options.Promise.all(asyncBindingsApplied)
}

function applyBindingsToDescendants (viewModelOrBindingContext, rootNode) {
  const asyncBindingsApplied = new Set();
  if (rootNode.nodeType === 1 || rootNode.nodeType === 8) {
    applyBindingsToDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode, true, asyncBindingsApplied);
  }
  return options.Promise.all(asyncBindingsApplied)
}

function applyBindings (viewModelOrBindingContext, rootNode) {
  const asyncBindingsApplied = new Set();
  // If jQuery is loaded after Knockout, we won't initially have access to it. So save it here.
  if (!options.jQuery === undefined && window.jQuery) {
    options.jQuery = window.jQuery;
  }

  if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8)) { throw new Error('ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node') }
  rootNode = rootNode || window.document.body; // Make "rootNode" parameter optional

  applyBindingsToNodeAndDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode, true, asyncBindingsApplied);
  return options.Promise.all(asyncBindingsApplied)
}

function onBindingError (spec) {
  var error, bindingText;
  if (spec.bindingKey) {
        // During: 'init' or initial 'update'
    error = spec.errorCaptured;
    spec.message = 'Unable to process binding "' + spec.bindingKey +
            '" in binding "' + spec.bindingKey +
            '"\nMessage: ' + (error.message ? error.message : error);
  } else {
        // During: 'apply'
    error = spec.errorCaptured;
  }
  try {
    extend(error, spec);
  } catch (e) {
        // Read-only error e.g. a DOMEXception.
    spec.stack = error.stack;
    error = new Error(error.message ? error.message : error);
    extend(error, spec);
  }
  options.onError(error);
}

/* eslint no-cond-assign: 0 */
// Objective:
// * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
//   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
// * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
//   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
//   previously mapped - retain those nodes, and just insert/delete other ones

// "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
// You can use this, for example, to activate bindings on those nodes.

function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
    // Map this array value inside a dependentObservable so we re-map when any dependency changes
    var mappedNodes = [];
    var dependentObservable = computed(function() {
        var newMappedNodes = mapping(valueToMap, index, fixUpContinuousNodeArray(mappedNodes, containerNode)) || [];

        // On subsequent evaluations, just replace the previously-inserted DOM nodes
        if (mappedNodes.length > 0) {
            replaceDomNodes(mappedNodes, newMappedNodes);
            if (callbackAfterAddingNodes)
                ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
        }

        // Replace the contents of the mappedNodes array, thereby updating the record
        // of which nodes would be deleted if valueToMap was itself later removed
        mappedNodes.length = 0;
        arrayPushAll(mappedNodes, newMappedNodes);
    }, null, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: function() { return !anyDomNodeIsAttachedToDocument(mappedNodes); } });
    return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
}

var lastMappingResultDomDataKey = nextKey();
var deletedItemDummyValue = nextKey();

function setDomNodeChildrenFromArrayMapping(domNode, array, mapping, options$$1, callbackAfterAddingNodes) {
    // Compare the provided array against the previous one
    array = array || [];
    options$$1 = options$$1 || {};
    var isFirstExecution = get(domNode, lastMappingResultDomDataKey) === undefined;
    var lastMappingResult = get(domNode, lastMappingResultDomDataKey) || [];
    var lastArray = arrayMap(lastMappingResult, function (x) { return x.arrayEntry; });
    var editScript = compareArrays(lastArray, array, options$$1['dontLimitMoves']);

    // Build the new mapping result
    var newMappingResult = [];
    var lastMappingResultIndex = 0;
    var newMappingResultIndex = 0;

    var nodesToDelete = [];
    var itemsToProcess = [];
    var itemsForBeforeRemoveCallbacks = [];
    var itemsForMoveCallbacks = [];
    var itemsForAfterAddCallbacks = [];
    var mapData;

    function itemMovedOrRetained(editScriptIndex, oldPosition) {
        mapData = lastMappingResult[oldPosition];
        if (newMappingResultIndex !== oldPosition)
            itemsForMoveCallbacks[editScriptIndex] = mapData;
        // Since updating the index might change the nodes, do so before calling fixUpContinuousNodeArray
        mapData.indexObservable(newMappingResultIndex++);
        fixUpContinuousNodeArray(mapData.mappedNodes, domNode);
        newMappingResult.push(mapData);
        itemsToProcess.push(mapData);
    }

    function callCallback(callback, items) {
        if (callback) {
            for (var i = 0, n = items.length; i < n; i++) {
                if (items[i]) {
                    arrayForEach(items[i].mappedNodes, function(node) {
                        callback(node, i, items[i].arrayEntry);
                    });
                }
            }
        }
    }

    for (var i = 0, editScriptItem, movedIndex; editScriptItem = editScript[i]; i++) {
        movedIndex = editScriptItem['moved'];
        switch (editScriptItem['status']) {
        case "deleted":
            if (movedIndex === undefined) {
                mapData = lastMappingResult[lastMappingResultIndex];

                // Stop tracking changes to the mapping for these nodes
                if (mapData.dependentObservable) {
                    mapData.dependentObservable.dispose();
                    mapData.dependentObservable = undefined;
                }

                // Queue these nodes for later removal
                if (fixUpContinuousNodeArray(mapData.mappedNodes, domNode).length) {
                    if (options$$1['beforeRemove']) {
                        newMappingResult.push(mapData);
                        itemsToProcess.push(mapData);
                        if (mapData.arrayEntry === deletedItemDummyValue) {
                            mapData = null;
                        } else {
                            itemsForBeforeRemoveCallbacks[i] = mapData;
                        }
                    }
                    if (mapData) {
                        nodesToDelete.push.apply(nodesToDelete, mapData.mappedNodes);
                    }
                }
            }
            lastMappingResultIndex++;
            break;

        case "retained":
            itemMovedOrRetained(i, lastMappingResultIndex++);
            break;

        case "added":
            if (movedIndex !== undefined) {
                itemMovedOrRetained(i, movedIndex);
            } else {
                mapData = { arrayEntry: editScriptItem['value'], indexObservable: observable(newMappingResultIndex++) };
                newMappingResult.push(mapData);
                itemsToProcess.push(mapData);
                if (!isFirstExecution)
                    itemsForAfterAddCallbacks[i] = mapData;
            }
            break;
        }
    }

    // Store a copy of the array items we just considered so we can difference it next time
    set(domNode, lastMappingResultDomDataKey, newMappingResult);

    // Call beforeMove first before any changes have been made to the DOM
    callCallback(options$$1['beforeMove'], itemsForMoveCallbacks);

    // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
    arrayForEach(nodesToDelete, options$$1['beforeRemove'] ? cleanNode : removeNode);

    // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
    i = 0;
    for (var nextNode = firstChild(domNode), lastNode, node; mapData = itemsToProcess[i]; i++) {
        // Get nodes for newly added items
        if (!mapData.mappedNodes)
            extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

        // Put nodes in the right place if they aren't there already
        for (var j = 0; node = mapData.mappedNodes[j]; nextNode = node.nextSibling, lastNode = node, j++) {
            if (node !== nextNode)
                insertAfter(domNode, node, lastNode);
        }

        // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
        if (!mapData.initialized && callbackAfterAddingNodes) {
            callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
            mapData.initialized = true;
        }
    }

    // If there's a beforeRemove callback, call it after reordering.
    // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
    // some sort of animation, which is why we first reorder the nodes that will be removed. If the
    // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
    // Perhaps we'll make that change in the future if this scenario becomes more common.
    callCallback(options$$1['beforeRemove'], itemsForBeforeRemoveCallbacks);

    // Replace the stored values of deleted items with a dummy value. This provides two benefits: it marks this item
    // as already "removed" so we won't call beforeRemove for it again, and it ensures that the item won't match up
    // with an actual item in the array and appear as "retained" or "moved".
    for (i = 0; i < itemsForBeforeRemoveCallbacks.length; ++i) {
        if (itemsForBeforeRemoveCallbacks[i]) {
            itemsForBeforeRemoveCallbacks[i].arrayEntry = deletedItemDummyValue;
        }
    }

    // Finally call afterMove and afterAdd callbacks
    callCallback(options$$1['afterMove'], itemsForMoveCallbacks);
    callCallback(options$$1['afterAdd'], itemsForAfterAddCallbacks);
}

var attr = {
    update: function(element, valueAccessor, allBindings) {
        var value = unwrap(valueAccessor()) || {};
        objectForEach(value, function(attrName, attrValue) {
            attrValue = unwrap(attrValue);

            // Find the namespace of this attribute, if any.
            // Defaulting to `null` should be ok, as
            //
            //  element.setAttributeNS( null, name, value ) ~ element.setAttribute( name, value )
            //  element.removetAttributeNS( null, name ) ~ element.removeAttribute( name )
            //
            var prefixLen = attrName.indexOf(':');
            var namespace = prefixLen < 0 ? null : element.lookupNamespaceURI( attrName.substr(0, prefixLen) );

            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
            // when someProp is a "no value"-like value (strictly null, false, or undefined)
            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
            var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);

            if (toRemove) {
                element.removeAttributeNS(namespace, attrName);
            } else {
                element.setAttributeNS(namespace, attrName, attrValue.toString());
            }

            // Treat "name" specially - although you can think of it as an attribute, it also needs
            // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
            // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
            // entirely, and there's no strong reason to allow for such casing in HTML.
            if (attrName === "name") {
                setElementName(element, toRemove ? "" : attrValue.toString());
            }
        });
    }
};

var checked = {
    after: ['value', 'attr'],
    init: function (element, valueAccessor, allBindings) {
        var checkedValue = pureComputed(function() {
            // Treat "value" like "checkedValue" when it is included with "checked" binding
            if (allBindings['has']('checkedValue')) {
                return unwrap(allBindings.get('checkedValue'));
            } else if (allBindings['has']('value')) {
                return unwrap(allBindings.get('value'));
            }

            return element.value;
        });

        function updateModel() {
            // This updates the model value from the view value.
            // It runs in response to DOM events (click) and changes in checkedValue.
            var isChecked = element.checked,
                elemValue = useCheckedValue ? checkedValue() : isChecked;

            // When we're first setting up this computed, don't change any model state.
            if (isInitial()) {
                return;
            }

            // We can ignore unchecked radio buttons, because some other radio
            // button will be getting checked, and that one can take care of updating state.
            if (isRadio && !isChecked) {
                return;
            }

            var modelValue = ignore(valueAccessor);
            if (valueIsArray) {
                var writableValue = rawValueIsNonArrayObservable ? modelValue.peek() : modelValue;
                if (oldElemValue !== elemValue) {
                    // When we're responding to the checkedValue changing, and the element is
                    // currently checked, replace the old elem value with the new elem value
                    // in the model array.
                    if (isChecked) {
                        addOrRemoveItem(writableValue, elemValue, true);
                        addOrRemoveItem(writableValue, oldElemValue, false);
                    }

                    oldElemValue = elemValue;
                } else {
                    // When we're responding to the user having checked/unchecked a checkbox,
                    // add/remove the element value to the model array.
                    addOrRemoveItem(writableValue, elemValue, isChecked);
                }
                if (rawValueIsNonArrayObservable && isWriteableObservable(modelValue)) {
                    modelValue(writableValue);
                }
            } else {
                valueAccessor(elemValue, {onlyIfChanged: true});
            }
        }

        function updateView() {
            // This updates the view value from the model value.
            // It runs in response to changes in the bound (checked) value.
            var modelValue = unwrap(valueAccessor());

            if (valueIsArray) {
                // When a checkbox is bound to an array, being checked represents its value being present in that array
                element.checked = arrayIndexOf(modelValue, checkedValue()) >= 0;
            } else if (isCheckbox) {
                // When a checkbox is bound to any other value (not an array), being checked represents the value being trueish
                element.checked = modelValue;
            } else {
                // For radio buttons, being checked means that the radio button's value corresponds to the model value
                element.checked = (checkedValue() === modelValue);
            }
        }

        var isCheckbox = element.type == "checkbox",
            isRadio = element.type == "radio";

        // Only bind to check boxes and radio buttons
        if (!isCheckbox && !isRadio) {
            return;
        }

        var rawValue = valueAccessor(),
            valueIsArray = isCheckbox && (unwrap(rawValue) instanceof Array),
            rawValueIsNonArrayObservable = !(valueIsArray && rawValue.push && rawValue.splice),
            oldElemValue = valueIsArray ? checkedValue() : undefined,
            useCheckedValue = isRadio || valueIsArray;

        // Set up two computeds to update the binding:

        // The first responds to changes in the checkedValue value and to element clicks
        computed(updateModel, null, { disposeWhenNodeIsRemoved: element });
        registerEventHandler(element, "click", updateModel);

        // The second responds to changes in the model value (the one associated with the checked binding)
        computed(updateView, null, { disposeWhenNodeIsRemoved: element });

        rawValue = undefined;
    }
};

var checkedValue = {
    update: function (element, valueAccessor) {
        element.value = unwrap(valueAccessor());
    }
};

// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    return {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var newValueAccessor = function () {
                var result = {};
                result[eventName] = valueAccessor();
                return result;
            };
            eventHandler.init.call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
        }
    };
}

var eventHandler = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var eventsToHandle = valueAccessor() || {};
        objectForEach(eventsToHandle, function(eventName) {
            if (typeof eventName == "string") {
                registerEventHandler(element, eventName, function (event) {
                    var handlerReturnValue;
                    var handlerFunction = valueAccessor()[eventName];
                    if (!handlerFunction)
                        return;

                    try {
                        // Take all the event args, and prefix with the viewmodel
                        var argsForHandler = makeArray(arguments);
                        viewModel = bindingContext['$data'];
                        argsForHandler.unshift(viewModel);
                        handlerReturnValue = handlerFunction.apply(viewModel, argsForHandler);
                    } finally {
                        if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                            if (event.preventDefault)
                                event.preventDefault();
                            else
                                event.returnValue = false;
                        }
                    }

                    var bubble = allBindings.get(eventName + 'Bubble') !== false;
                    if (!bubble) {
                        event.cancelBubble = true;
                        if (event.stopPropagation)
                            event.stopPropagation();
                    }
                });
            }
        });
    }
};


var onHandler = {
    init: eventHandler.init,
    preprocess: function (value, key, addBinding) {
      addBinding(key.replace('on.', ''), '=>' + value);
    }
};

// 'click' is just a shorthand for the usual full-length event:{click:handler}
var click = makeEventHandlerShortcut('click');

var css = {
    aliases: ['class'],
    update: function (element, valueAccessor) {
        var value = unwrap(valueAccessor());
        if (value !== null && typeof value == "object") {
            objectForEach(value, function(className, shouldHaveClass) {
                shouldHaveClass = unwrap(shouldHaveClass);
                toggleDomNodeCssClass(element, className, shouldHaveClass);
            });
        } else {
            value = stringTrim(String(value || '')); // Make sure we don't try to store or set a non-string value
            toggleDomNodeCssClass(element, element[css.classesWrittenByBindingKey], false);
            element[css.classesWrittenByBindingKey] = value;
            toggleDomNodeCssClass(element, value, true);
        }
    },
    classesWrittenByBindingKey: createSymbolOrString('__ko__cssValue')
};

var enable = {
    update: function (element, valueAccessor) {
        var value = unwrap(valueAccessor());
        if (value && element.disabled) {
            element.removeAttribute("disabled");
        } else if ((!value) && (!element.disabled)) {
            element.disabled = true;
        }
    }
};

var disable = {
    update: function (element, valueAccessor) {
        enable.update(element, function() { return !unwrap(valueAccessor()); });
    }
};

var hasfocusUpdatingProperty = createSymbolOrString('__ko_hasfocusUpdating');
var hasfocusLastValue = createSymbolOrString('__ko_hasfocusLastValue');

var hasfocus = {
    init: function(element, valueAccessor /*, allBindings */) {
        var handleElementFocusChange = function(isFocused) {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            var ownerDoc = element.ownerDocument;
            if ("activeElement" in ownerDoc) {
                var active;
                try {
                    active = ownerDoc.activeElement;
                } catch(e) {
                    // IE9 throws if you access activeElement during page load (see issue #703)
                    active = ownerDoc.body;
                }
                isFocused = (active === element);
            }
            // var modelValue = valueAccessor();
            valueAccessor(isFocused, {onlyIfChanged: true});

            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
            element[hasfocusLastValue] = isFocused;
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        registerEventHandler(element, "focus", handleElementFocusIn);
        registerEventHandler(element, "focusin", handleElementFocusIn); // For IE
        registerEventHandler(element, "blur",  handleElementFocusOut);
        registerEventHandler(element, "focusout",  handleElementFocusOut); // For IE
    },
    update: function(element, valueAccessor) {
        var value = !!unwrap(valueAccessor());

        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
            value ? element.focus() : element.blur();

            // In IE, the blur method doesn't always cause the element to lose focus (for example, if the window is not in focus).
            // Setting focus to the body element does seem to be reliable in IE, but should only be used if we know that the current
            // element was focused already.
            if (!value && element[hasfocusLastValue]) {
                element.ownerDocument.body.focus();
            }

            // For IE, which doesn't reliably fire "focus" or "blur" events synchronously
            ignore(triggerEvent, null, [element, value ? "focusin" : "focusout"]);
        }
    }
};

var html = {
    init: function() {
        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
        return {
            'controlsDescendantBindings': true
        };
    },
    //
    // Modify internal, per ko.punches and :
    //      http://stackoverflow.com/a/15348139
    update: function(element, valueAccessor) {
        setHtml(element, valueAccessor());
    },
    allowVirtualElements: true
};

var $let = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext$$1) {
        // Make a modified binding context, with extra properties, and apply it to descendant elements
        var innerContext = bindingContext$$1['extend'](valueAccessor);
        applyBindingsToDescendants(innerContext, element);

        return { 'controlsDescendantBindings': true };
    },
    allowVirtualElements: true
};

var hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

// Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
// are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
// that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
var selectExtensions = {
    optionsValueDomDataKey: undefined,

    readValue : function(element) {
        switch (tagNameLower(element)) {
        case 'option':
            if (element[hasDomDataExpandoProperty] === true)
                return get(element, selectExtensions.optionValueDomDataKey);
            return element.value;
        case 'select':
            return element.selectedIndex >= 0 ? selectExtensions.readValue(element.options[element.selectedIndex]) : undefined;
        default:
            return element.value;
        }
    },

    writeValue: function(element, value, allowUnset) {
        switch (tagNameLower(element)) {
        case 'option':
            switch(typeof value) {
            case "string":
                set(element, selectExtensions.optionValueDomDataKey, undefined);
                if (hasDomDataExpandoProperty in element) { // IE <= 8 throws errors if you delete non-existent properties from a DOM node
                    delete element[hasDomDataExpandoProperty];
                }
                element.value = value;
                break;
            default:
                // Store arbitrary object using DomData
                set(element, selectExtensions.optionValueDomDataKey, value);
                element[hasDomDataExpandoProperty] = true;

                // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                element.value = typeof value === "number" ? value : "";
                break;
            }
            break;
        case 'select':
            if (value === "" || value === null)       // A blank string or null value will select the caption
                value = undefined;
            var selection = -1;
            for (var i = 0, n = element.options.length, optionValue; i < n; ++i) {
                optionValue = selectExtensions.readValue(element.options[i]);
                // Include special check to handle selecting a caption with a blank string value
                if (optionValue == value || (optionValue === "" && value === undefined)) {
                    selection = i;
                    break;
                }
            }
            if (allowUnset || selection >= 0 || (value === undefined && element.size > 1)) {
                element.selectedIndex = selection;
            }
            break;
        default:
            if ((value === null) || (value === undefined))
                value = "";
            element.value = value;
            break;
        }
    }
};

var captionPlaceholder = {};

var options$2 = {
    init: function(element) {
        if (tagNameLower(element) !== "select")
            throw new Error("options binding applies only to SELECT elements");

        // Remove all existing <option>s.
        while (element.length > 0) {
            element.remove(0);
        }

        // Ensures that the binding processor doesn't try to bind the options
        return { 'controlsDescendantBindings': true };
    },
    update: function (element, valueAccessor, allBindings) {
        function selectedOptions() {
            return arrayFilter(element.options, function (node) { return node.selected; });
        }

        var selectWasPreviouslyEmpty = element.length == 0,
            multiple = element.multiple,
            previousScrollTop = (!selectWasPreviouslyEmpty && multiple) ? element.scrollTop : null,
            unwrappedArray = unwrap(valueAccessor()),
            valueAllowUnset = allBindings.get('valueAllowUnset') && allBindings['has']('value'),
            includeDestroyed = allBindings.get('optionsIncludeDestroyed'),
            arrayToDomNodeChildrenOptions = {},
            captionValue,
            filteredArray,
            previousSelectedValues = [];

        if (!valueAllowUnset) {
            if (multiple) {
                previousSelectedValues = arrayMap(selectedOptions(), selectExtensions.readValue);
            } else if (element.selectedIndex >= 0) {
                previousSelectedValues.push(selectExtensions.readValue(element.options[element.selectedIndex]));
            }
        }

        if (unwrappedArray) {
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            filteredArray = arrayFilter(unwrappedArray, function(item) {
                return includeDestroyed || item === undefined || item === null || !unwrap(item['_destroy']);
            });

            // If caption is included, add it to the array
            if (allBindings['has']('optionsCaption')) {
                captionValue = unwrap(allBindings.get('optionsCaption'));
                // If caption value is null or undefined, don't show a caption
                if (captionValue !== null && captionValue !== undefined) {
                    filteredArray.unshift(captionPlaceholder);
                }
            }
        } else {
            // If a falsy value is provided (e.g. null), we'll simply empty the select element
        }

        function applyToObject(object, predicate, defaultValue) {
            var predicateType = typeof predicate;
            if (predicateType == "function")    // Given a function; run it against the data value
                return predicate(object);
            else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                return object[predicate];
            else                                // Given no optionsText arg; use the data value itself
                return defaultValue;
        }

        // The following functions can run at two different times:
        // The first is when the whole array is being updated directly from this binding handler.
        // The second is when an observable value for a specific array entry is updated.
        // oldOptions will be empty in the first case, but will be filled with the previously generated option in the second.
        var itemUpdate = false;
        function optionForArrayItem(arrayEntry, index, oldOptions) {
            if (oldOptions.length) {
                previousSelectedValues = !valueAllowUnset && oldOptions[0].selected ? [ selectExtensions.readValue(oldOptions[0]) ] : [];
                itemUpdate = true;
            }
            var option = element.ownerDocument.createElement("option");
            if (arrayEntry === captionPlaceholder) {
                setTextContent(option, allBindings.get('optionsCaption'));
                selectExtensions.writeValue(option, undefined);
            } else {
                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings.get('optionsValue'), arrayEntry);
                selectExtensions.writeValue(option, unwrap(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings.get('optionsText'), optionValue);
                setTextContent(option, optionText);
            }
            return [option];
        }

        // By using a beforeRemove callback, we delay the removal until after new items are added. This fixes a selection
        // problem in IE<=8 and Firefox. See https://github.com/knockout/knockout/issues/1208
        arrayToDomNodeChildrenOptions['beforeRemove'] =
            function (option) {
                element.removeChild(option);
            };

        function setSelectionCallback(arrayEntry, newOptions) {
            if (itemUpdate && valueAllowUnset) {
                // The model value is authoritative, so make sure its value is the one selected
                // There is no need to use dependencyDetection.ignore since setDomNodeChildrenFromArrayMapping does so already.
                selectExtensions.writeValue(element, unwrap(allBindings.get('value')), true /* allowUnset */);
            } else if (previousSelectedValues.length) {
                // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
                // That's why we first added them without selection. Now it's time to set the selection.
                var isSelected = arrayIndexOf(previousSelectedValues, selectExtensions.readValue(newOptions[0])) >= 0;
                setOptionNodeSelectionState(newOptions[0], isSelected);

                // If this option was changed from being selected during a single-item update, notify the change
                if (itemUpdate && !isSelected) {
                    ignore(triggerEvent, null, [element, "change"]);
                }
            }
        }

        var callback = setSelectionCallback;
        if (allBindings['has']('optionsAfterRender') && typeof allBindings.get('optionsAfterRender') == "function") {
            callback = function(arrayEntry, newOptions) {
                setSelectionCallback(arrayEntry, newOptions);
                ignore(allBindings.get('optionsAfterRender'), null, [newOptions[0], arrayEntry !== captionPlaceholder ? arrayEntry : undefined]);
            };
        }

        setDomNodeChildrenFromArrayMapping(element, filteredArray, optionForArrayItem, arrayToDomNodeChildrenOptions, callback);

        ignore(function () {
            if (valueAllowUnset) {
                // The model value is authoritative, so make sure its value is the one selected
                selectExtensions.writeValue(element, unwrap(allBindings.get('value')), true /* allowUnset */);
            } else {
                // Determine if the selection has changed as a result of updating the options list
                var selectionChanged;
                if (multiple) {
                    // For a multiple-select box, compare the new selection count to the previous one
                    // But if nothing was selected before, the selection can't have changed
                    selectionChanged = previousSelectedValues.length && selectedOptions().length < previousSelectedValues.length;
                } else {
                    // For a single-select box, compare the current value to the previous value
                    // But if nothing was selected before or nothing is selected now, just look for a change in selection
                    selectionChanged = (previousSelectedValues.length && element.selectedIndex >= 0)
                        ? (selectExtensions.readValue(element.options[element.selectedIndex]) !== previousSelectedValues[0])
                        : (previousSelectedValues.length || element.selectedIndex >= 0);
                }

                // Ensure consistency between model value and selected option.
                // If the dropdown was changed so that selection is no longer the same,
                // notify the value or selectedOptions binding.
                if (selectionChanged) {
                    triggerEvent(element, "change");
                }
            }
        });

        // Workaround for IE bug
        ensureSelectElementIsRenderedCorrectly(element);

        if (previousScrollTop && Math.abs(previousScrollTop - element.scrollTop) > 20)
            element.scrollTop = previousScrollTop;
    }
};

selectExtensions.optionValueDomDataKey = nextKey();

var selectedOptions = {
    after: ['options', 'foreach'],

    init: function (element, valueAccessor, allBindings) {
        registerEventHandler(element, "change", function () {
            var value = valueAccessor(), valueToWrite = [];
            arrayForEach(element.getElementsByTagName("option"), function(node) {
                if (node.selected)
                    valueToWrite.push(selectExtensions.readValue(node));
            });
            valueAccessor(valueToWrite);
        });
    },

    update: function (element, valueAccessor) {
        if (tagNameLower(element) != "select")
            throw new Error("values binding applies only to SELECT elements");

        var newValue = unwrap(valueAccessor()),
            previousScrollTop = element.scrollTop;

        if (newValue && typeof newValue.length == "number") {
            arrayForEach(element.getElementsByTagName("option"), function(node) {
                var isSelected = arrayIndexOf(newValue, selectExtensions.readValue(node)) >= 0;
                if (node.selected != isSelected) {      // This check prevents flashing of the select element in IE
                    setOptionNodeSelectionState(node, isSelected);
                }
            });
        }

        element.scrollTop = previousScrollTop;
    }
};

var style = {
    update: function (element, valueAccessor) {
        var value = unwrap(valueAccessor() || {});
        objectForEach(value, function(styleName, styleValue) {
            styleValue = unwrap(styleValue);

            if (styleValue === null || styleValue === undefined || styleValue === false) {
                // Empty string removes the value, whereas null/undefined have no effect
                styleValue = "";
            }

            element.style[styleName] = styleValue;
        });
    }
};

var submit = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (typeof valueAccessor() != "function")
            throw new Error("The value for a submit binding must be a function");
        registerEventHandler(element, "submit", function (event) {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(bindingContext['$data'], element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    if (event.preventDefault)
                        event.preventDefault();
                    else
                        event.returnValue = false;
                }
            }
        });
    }
};

var text = {
    init: function() {
        // Prevent binding on the dynamically-injected text node (as developers are unlikely to expect that, and it has security implications).
        // It should also make things faster, as we no longer have to consider whether the text node might be bindable.
        return { controlsDescendantBindings: true };
    },
    update: function (element, valueAccessor) {
        setTextContent(element, valueAccessor());
    },
    allowVirtualElements: true
};

var parseVersion;
var operaVersion;
var userAgent;
var safariVersion;
var firefoxVersion;

if (window.navigator) {
    parseVersion = function (matches) {
        if (matches) {
            return parseFloat(matches[1]);
        }
    };

    // Detect various browser versions because some old versions don't fully support the 'input' event
    operaVersion = window.opera && window.opera.version && parseInt(window.opera.version()),
        userAgent = window.navigator.userAgent,
        safariVersion = parseVersion(userAgent.match(/^(?:(?!chrome).)*version\/([^ ]*) safari/i)),
        firefoxVersion = parseVersion(userAgent.match(/Firefox\/([^ ]*)/));
}

// IE 8 and 9 have bugs that prevent the normal events from firing when the value changes.
// But it does fire the 'selectionchange' event on many of those, presumably because the
// cursor is moving and that counts as the selection changing. The 'selectionchange' event is
// fired at the document level only and doesn't directly indicate which element changed. We
// set up just one event handler for the document and use 'activeElement' to determine which
// element was changed.
if (ieVersion < 10) {
    var selectionChangeRegisteredName = nextKey(),
        selectionChangeHandlerName = nextKey();
    var selectionChangeHandler = function(event) {
        var target = this.activeElement,
            handler = target && get(target, selectionChangeHandlerName);
        if (handler) {
            handler(event);
        }
    };
    var registerForSelectionChangeEvent = function (element, handler) {
        var ownerDoc = element.ownerDocument;
        if (!get(ownerDoc, selectionChangeRegisteredName)) {
            set(ownerDoc, selectionChangeRegisteredName, true);
            registerEventHandler(ownerDoc, 'selectionchange', selectionChangeHandler);
        }
        set(element, selectionChangeHandlerName, handler);
    };
}

var textInput = {
    aliases: 'textinput',
    init: function (element, valueAccessor) {

        var previousElementValue = element.value,
            timeoutHandle,
            elementValueBeforeEvent;

        var updateModel = function (event) {
            clearTimeout(timeoutHandle);
            elementValueBeforeEvent = timeoutHandle = undefined;

            var elementValue = element.value;
            if (previousElementValue !== elementValue) {
                // Provide a way for tests to know exactly which event was processed
                if (options.debug && event) element['_ko_textInputProcessedEvent'] = event.type;
                previousElementValue = elementValue;
                valueAccessor(elementValue);
            }
        };

        var deferUpdateModel = function (event) {
            if (!timeoutHandle) {
                // The elementValueBeforeEvent variable is set *only* during the brief gap between an
                // event firing and the updateModel function running. This allows us to ignore model
                // updates that are from the previous state of the element, usually due to techniques
                // such as rateLimit. Such updates, if not ignored, can cause keystrokes to be lost.
                elementValueBeforeEvent = element.value;
                var handler = options.debug ? updateModel.bind(element, {type: event.type}) : updateModel;
                timeoutHandle = safeSetTimeout(handler, 4);
            }
        };

        // IE9 will mess up the DOM if you handle events synchronously which results in DOM changes (such as other bindings);
        // so we'll make sure all updates are asynchronous
        var ieUpdateModel = ieVersion === 9 ? deferUpdateModel : updateModel;

        var updateView = function () {
            var modelValue = unwrap(valueAccessor());

            if (modelValue === null || modelValue === undefined) {
                modelValue = '';
            }

            if (elementValueBeforeEvent !== undefined && modelValue === elementValueBeforeEvent) {
                safeSetTimeout(updateView, 4);
                return;
            }

            // Update the element only if the element and model are different. On some browsers, updating the value
            // will move the cursor to the end of the input, which would be bad while the user is typing.
            if (element.value !== modelValue) {
                previousElementValue = modelValue;  // Make sure we ignore events (propertychange) that result from updating the value
                element.value = modelValue;
            }
        };

        var onEvent = function (event, handler) {
            registerEventHandler(element, event, handler);
        };

        if (options.debug && textInput._forceUpdateOn) {
            // Provide a way for tests to specify exactly which events are bound
            arrayForEach(textInput._forceUpdateOn, function(eventName) {
                if (eventName.slice(0,5) == 'after') {
                    onEvent(eventName.slice(5), deferUpdateModel);
                } else {
                    onEvent(eventName, updateModel);
                }
            });
        } else {
            if (ieVersion < 10) {
                // Internet Explorer <= 8 doesn't support the 'input' event, but does include 'propertychange' that fires whenever
                // any property of an element changes. Unlike 'input', it also fires if a property is changed from JavaScript code,
                // but that's an acceptable compromise for this binding. IE 9 does support 'input', but since it doesn't fire it
                // when using autocomplete, we'll use 'propertychange' for it also.
                onEvent('propertychange', function(event) {
                    if (event.propertyName === 'value') {
                        ieUpdateModel(event);
                    }
                });

                if (ieVersion == 8) {
                    // IE 8 has a bug where it fails to fire 'propertychange' on the first update following a value change from
                    // JavaScript code. It also doesn't fire if you clear the entire value. To fix this, we bind to the following
                    // events too.
                    onEvent('keyup', updateModel);      // A single keystoke
                    onEvent('keydown', updateModel);    // The first character when a key is held down
                }
                if (ieVersion >= 8) {
                    // Internet Explorer 9 doesn't fire the 'input' event when deleting text, including using
                    // the backspace, delete, or ctrl-x keys, clicking the 'x' to clear the input, dragging text
                    // out of the field, and cutting or deleting text using the context menu. 'selectionchange'
                    // can detect all of those except dragging text out of the field, for which we use 'dragend'.
                    // These are also needed in IE8 because of the bug described above.
                    registerForSelectionChangeEvent(element, ieUpdateModel);  // 'selectionchange' covers cut, paste, drop, delete, etc.
                    onEvent('dragend', deferUpdateModel);
                }
            } else {
                // All other supported browsers support the 'input' event, which fires whenever the content of the element is changed
                // through the user interface.
                onEvent('input', updateModel);

                if (safariVersion < 5 && tagNameLower(element) === "textarea") {
                    // Safari <5 doesn't fire the 'input' event for <textarea> elements (it does fire 'textInput'
                    // but only when typing). So we'll just catch as much as we can with keydown, cut, and paste.
                    onEvent('keydown', deferUpdateModel);
                    onEvent('paste', deferUpdateModel);
                    onEvent('cut', deferUpdateModel);
                } else if (operaVersion < 11) {
                    // Opera 10 doesn't always fire the 'input' event for cut, paste, undo & drop operations.
                    // We can try to catch some of those using 'keydown'.
                    onEvent('keydown', deferUpdateModel);
                } else if (firefoxVersion < 4.0) {
                    // Firefox <= 3.6 doesn't fire the 'input' event when text is filled in through autocomplete
                    onEvent('DOMAutoComplete', updateModel);

                    // Firefox <=3.5 doesn't fire the 'input' event when text is dropped into the input.
                    onEvent('dragdrop', updateModel);       // <3.5
                    onEvent('drop', updateModel);           // 3.5
                }
            }
        }

        // Bind to the change event so that we can catch programmatic updates of the value that fire this event.
        onEvent('change', updateModel);

        computed(updateView, null, { disposeWhenNodeIsRemoved: element });
    }
};

// // textinput is an alias for textInput
// ko.bindingHandlers['textinput'] = {
//     // preprocess is the only way to set up a full alias
//     'preprocess': function (value, name, addBinding) {
//         addBinding('textInput', value);
//     }
// };

var uniqueName = {
    init: function (element, valueAccessor) {
        if (valueAccessor()) {
            var name = "ko_unique_" + (++uniqueName.currentIndex);
            setElementName(element, name);
        }
    },
    currentIndex: 0
};

var value = {
    after: ['options', 'foreach'],
    init: function (element, valueAccessor, allBindings) {
        // If the value binding is placed on a radio/checkbox, then just pass through to checkedValue and quit
        if (element.tagName.toLowerCase() == "input" && (element.type == "checkbox" || element.type == "radio")) {
            applyBindingAccessorsToNode(element, { 'checkedValue': valueAccessor });
            return;
        }

        // Always catch "change" event; possibly other events too if asked
        var eventsToCatch = ["change"];
        var requestedEventsToCatch = allBindings.get("valueUpdate");
        var propertyChangedFired = false;
        var elementValueBeforeEvent = null;

        if (requestedEventsToCatch) {
            if (typeof requestedEventsToCatch == "string") // Allow both individual event names, and arrays of event names
                requestedEventsToCatch = [requestedEventsToCatch];
            arrayPushAll(eventsToCatch, requestedEventsToCatch);
            eventsToCatch = arrayGetDistinctValues(eventsToCatch);
        }

        var valueUpdateHandler = function() {
            elementValueBeforeEvent = null;
            propertyChangedFired = false;
            var modelValue = valueAccessor();
            var elementValue = selectExtensions.readValue(element);
            valueAccessor(elementValue);
        };

        // Workaround for https://github.com/SteveSanderson/knockout/issues/122
        // IE doesn't fire "change" events on textboxes if the user selects a value from its autocomplete list
        var ieAutoCompleteHackNeeded = ieVersion && element.tagName.toLowerCase() == "input" && element.type == "text"
                                       && element.autocomplete != "off" && (!element.form || element.form.autocomplete != "off");
        if (ieAutoCompleteHackNeeded && arrayIndexOf(eventsToCatch, "propertychange") == -1) {
            registerEventHandler(element, "propertychange", function () { propertyChangedFired = true; });
            registerEventHandler(element, "focus", function () { propertyChangedFired = false; });
            registerEventHandler(element, "blur", function() {
                if (propertyChangedFired) {
                    valueUpdateHandler();
                }
            });
        }

        arrayForEach(eventsToCatch, function(eventName) {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if (stringStartsWith(eventName, "after")) {
                handler = function() {
                    // The elementValueBeforeEvent variable is non-null *only* during the brief gap between
                    // a keyX event firing and the valueUpdateHandler running, which is scheduled to happen
                    // at the earliest asynchronous opportunity. We store this temporary information so that
                    // if, between keyX and valueUpdateHandler, the underlying model value changes separately,
                    // we can overwrite that model value change with the value the user just typed. Otherwise,
                    // techniques like rateLimit can trigger model changes at critical moments that will
                    // override the user's inputs, causing keystrokes to be lost.
                    elementValueBeforeEvent = selectExtensions.readValue(element);
                    safeSetTimeout(valueUpdateHandler, 0);
                };
                eventName = eventName.substring("after".length);
            }
            registerEventHandler(element, eventName, handler);
        });

        var updateFromModel = function () {
            var newValue = unwrap(valueAccessor());
            var elementValue = selectExtensions.readValue(element);

            if (elementValueBeforeEvent !== null && newValue === elementValueBeforeEvent) {
                safeSetTimeout(updateFromModel, 0);
                return;
            }

            var valueHasChanged = (newValue !== elementValue);

            if (valueHasChanged) {
                if (tagNameLower(element) === "select") {
                    var allowUnset = allBindings.get('valueAllowUnset');
                    var applyValueAction = function () {
                        selectExtensions.writeValue(element, newValue, allowUnset);
                    };
                    applyValueAction();

                    if (!allowUnset && newValue !== selectExtensions.readValue(element)) {
                        // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
                        // because you're not allowed to have a model value that disagrees with a visible UI selection.
                        ignore(triggerEvent, null, [element, "change"]);
                    } else {
                        // Workaround for IE6 bug: It won't reliably apply values to SELECT nodes during the same execution thread
                        // right after you've changed the set of OPTION nodes on it. So for that node type, we'll schedule a second thread
                        // to apply the value as well.
                        safeSetTimeout(applyValueAction, 0);
                    }
                } else {
                    selectExtensions.writeValue(element, newValue);
                }
            }
        };

        computed(updateFromModel, null, { disposeWhenNodeIsRemoved: element });
    }
};

var visible = {
    update: function (element, valueAccessor) {
        var value = unwrap(valueAccessor());
        var isCurrentlyVisible = !(element.style.display == "none");
        if (value && !isCurrentlyVisible)
            element.style.display = "";
        else if ((!value) && isCurrentlyVisible)
            element.style.display = "none";
    }
};

var hidden = {
    update: function (element, valueAccessor) {
        visible.update.call(this, element, function () { return !unwrap(valueAccessor()); });
    }
};

var using = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext$$1) {
        var innerContext = bindingContext$$1.createChildContext(valueAccessor);
        applyBindingsToDescendants(innerContext, element);
        return { controlsDescendantBindings: true };
    },
    allowVirtualElements: true
};

var bindings = {
    attr: attr,
    checked: checked,
    checkedValue: checkedValue,
    click: click,
    css: css, 'class': css,
    enable: enable,
    'event': eventHandler,
    disable: disable,
    hasfocus: hasfocus, hasFocus: hasfocus,
    hidden: hidden,
    html: html,
    'let': $let,
    on: onHandler,
    options: options$2,
    selectedOptions: selectedOptions,
    style: style,
    submit: submit,
    text: text,
    textInput: textInput,
    textinput: textInput,
    uniqueName: uniqueName,
    using: using,
    value: value,
    visible: visible
};

// A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
// logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
//
// Two are provided by default:
//  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
//  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
//                                           without reading/writing the actual element text content, since it will be overwritten
//                                           with the rendered template output.
// You can implement your own template source if you want to fetch/store templates somewhere other than in DOM elements.
// Template sources need to have the following functions:
//   text() 			- returns the template text from your storage location
//   text(value)		- writes the supplied template text to your storage location
//   data(key)			- reads values stored using data(key, value) - see below
//   data(key, value)	- associates "value" with this template and the key "key". Is used to store information like "isRewritten".
//
// Optionally, template sources can also have the following functions:
//   nodes()            - returns a DOM element containing the nodes of this template, where available
//   nodes(value)       - writes the given DOM element to your storage location
// If a DOM element is available for a given template source, template engines are encouraged to use it in preference over text()
// for improved speed. However, all templateSources must supply text() even if they don't supply nodes().
//
// Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
// using and overriding "makeTemplateSource" to return an instance of your custom template source.

// ---- ko.templateSources.domElement -----

// template types
var templateScript = 1;
var templateTextArea = 2;
var templateTemplate = 3;
var templateElement = 4;

function domElement(element) {
    this.domElement = element;

    if (!element) { return; }
    var tagNameLower$$1 = tagNameLower(element);
    this.templateType =
        tagNameLower$$1 === "script" ? templateScript :
        tagNameLower$$1 === "textarea" ? templateTextArea :
            // For browsers with proper <template> element support, where the .content property gives a document fragment
        tagNameLower$$1 == "template" && element.content && element.content.nodeType === 11 ? templateTemplate :
        templateElement;
}

domElement.prototype.text = function(/* valueToWrite */) {
    var elemContentsProperty = this.templateType === templateScript ? "text"
                             : this.templateType === templateTextArea ? "value"
                             : "innerHTML";

    if (arguments.length == 0) {
        return this.domElement[elemContentsProperty];
    } else {
        var valueToWrite = arguments[0];
        if (elemContentsProperty === "innerHTML")
            setHtml(this.domElement, valueToWrite);
        else
            this.domElement[elemContentsProperty] = valueToWrite;
    }
};

var dataDomDataPrefix = nextKey() + "_";
domElement.prototype.data = function(key /*, valueToWrite */) {
    if (arguments.length === 1) {
        return get(this.domElement, dataDomDataPrefix + key);
    } else {
        set(this.domElement, dataDomDataPrefix + key, arguments[1]);
    }
};

var templatesDomDataKey = nextKey();
function getTemplateDomData(element) {
    return get(element, templatesDomDataKey) || {};
}
function setTemplateDomData(element, data$$1) {
    set(element, templatesDomDataKey, data$$1);
}

domElement.prototype.nodes = function(/* valueToWrite */) {
    var element = this.domElement;
    if (arguments.length == 0) {
        var templateData = getTemplateDomData(element),
            containerData = templateData.containerData;
        return containerData || (
            this.templateType === templateTemplate ? element.content :
            this.templateType === templateElement ? element :
            undefined);
    } else {
        var valueToWrite = arguments[0];
        setTemplateDomData(element, {containerData: valueToWrite});
    }
};

// ---- ko.templateSources.anonymousTemplate -----
// Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
// For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
// Writing to "text" is still supported, but then the template data will not be available as DOM nodes.

function anonymousTemplate(element) {
    this.domElement = element;
}

anonymousTemplate.prototype = new domElement();
anonymousTemplate.prototype.constructor = anonymousTemplate;
anonymousTemplate.prototype.text = function(/* valueToWrite */) {
    if (arguments.length == 0) {
        var templateData = getTemplateDomData(this.domElement);
        if (templateData.textData === undefined && templateData.containerData)
            templateData.textData = templateData.containerData.innerHTML;
        return templateData.textData;
    } else {
        var valueToWrite = arguments[0];
        setTemplateDomData(this.domElement, {textData: valueToWrite});
    }
};

// If you want to make a custom template engine,
//
// [1] Inherit from this class (like ko.nativeTemplateEngine does)
// [2] Override 'renderTemplateSource', supplying a function with this signature:
//
//        function (templateSource, bindingContext, options) {
//            // - templateSource.text() is the text of the template you should render
//            // - bindingContext.$data is the data you should pass into the template
//            //   - you might also want to make bindingContext.$parent, bindingContext.$parents,
//            //     and bindingContext.$root available in the template too
//            // - options gives you access to any other properties set on "data-bind: { template: options }"
//            // - templateDocument is the document object of the template
//            //
//            // Return value: an array of DOM nodes
//        }
//
// [3] Override 'createJavaScriptEvaluatorBlock', supplying a function with this signature:
//
//        function (script) {
//            // Return value: Whatever syntax means "Evaluate the JavaScript statement 'script' and output the result"
//            //               For example, the jquery.tmpl template engine converts 'someScript' to '${ someScript }'
//        }
//
//     This is only necessary if you want to allow data-bind attributes to reference arbitrary template variables.
//     If you don't want to allow that, you can set the property 'allowTemplateRewriting' to false (like ko.nativeTemplateEngine does)
//     and then you don't need to override 'createJavaScriptEvaluatorBlock'.

function templateEngine() { }

extend(templateEngine.prototype, {
  renderTemplateSource: function (templateSource, bindingContext, options$$1, templateDocument) {
      options$$1.onError("Override renderTemplateSource");
  },

  createJavaScriptEvaluatorBlock: function (script) {
      options.onError("Override createJavaScriptEvaluatorBlock");
  },

  makeTemplateSource: function(template, templateDocument) {
      // Named template
      if (typeof template == "string") {
          templateDocument = templateDocument || document;
          var elem = templateDocument.getElementById(template);
          if (!elem)
              options.onError("Cannot find template with ID " + template);
          return new domElement(elem);
      } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
          // Anonymous template
          return new anonymousTemplate(template);
      } else
          options.onError("Unknown template type: " + template);
  },

  renderTemplate: function (template, bindingContext, options$$1, templateDocument) {
      var templateSource = this['makeTemplateSource'](template, templateDocument);
      return this.renderTemplateSource(templateSource, bindingContext, options$$1, templateDocument);
  }
});

var _templateEngine;

function setTemplateEngine (tEngine) {
  if ((tEngine !== undefined) && !(tEngine instanceof templateEngine)) {
        // TODO: ko.templateEngine to appropriate name
    throw new Error('templateEngine must inherit from ko.templateEngine')
  }
  _templateEngine = tEngine;
}

function invokeForEachNodeInContinuousRange (firstNode, lastNode, action) {
  let node;
  let nextInQueue = firstNode;
  let firstOutOfRangeNode = nextSibling(lastNode);
  while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
    nextInQueue = nextSibling(node);
    action(node, nextInQueue);
  }
}

function activateBindingsOnContinuousNodeArray (continuousNodeArray, bindingContext$$1, afterBindingCallback) {
  // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
  // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
  // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
  // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
  // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

  if (continuousNodeArray.length) {
    var firstNode = continuousNodeArray[0];
    var lastNode = continuousNodeArray[continuousNodeArray.length - 1];
    var parentNode = firstNode.parentNode;
    var provider = options.bindingProviderInstance;
    var preprocessNode = provider.preprocessNode;

    if (preprocessNode) {
      invokeForEachNodeInContinuousRange(firstNode, lastNode, function (node, nextNodeInRange) {
        var nodePreviousSibling = node.previousSibling;
        var newNodes = preprocessNode.call(provider, node);
        if (newNodes) {
          if (node === firstNode) { firstNode = newNodes[0] || nextNodeInRange; }
          if (node === lastNode) { lastNode = newNodes[newNodes.length - 1] || nodePreviousSibling; }
        }
      });

      // Because preprocessNode can change the nodes, including the first and last nodes, update continuousNodeArray to match.
      // We need the full set, including inner nodes, because the unmemoize step might remove the first node (and so the real
      // first node needs to be in the array).
      continuousNodeArray.length = 0;
      if (!firstNode) { // preprocessNode might have removed all the nodes, in which case there's nothing left to do
        return
      }
      if (firstNode === lastNode) {
        continuousNodeArray.push(firstNode);
      } else {
        continuousNodeArray.push(firstNode, lastNode);
        fixUpContinuousNodeArray(continuousNodeArray, parentNode);
      }
    }

    // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
    // whereas a regular applyBindings won't introduce new memoized nodes
    invokeForEachNodeInContinuousRange(firstNode, lastNode, function (node) {
      if (node.nodeType === 1 || node.nodeType === 8) { applyBindings(bindingContext$$1, node).then(afterBindingCallback); }
    });
    invokeForEachNodeInContinuousRange(firstNode, lastNode, function (node) {
      if (node.nodeType === 1 || node.nodeType === 8) { unmemoizeDomNodeAndDescendants(node, [bindingContext$$1]); }
    });

    // Make sure any changes done by applyBindings or unmemoize are reflected in the array
    fixUpContinuousNodeArray(continuousNodeArray, parentNode);
  }
}

function getFirstNodeFromPossibleArray (nodeOrNodeArray) {
  return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                    : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                    : null
}

function executeTemplate (targetNodeOrNodeArray, renderMode, template, bindingContext$$1, options$$1, afterBindingCallback) {
  options$$1 = options$$1 || {};
  var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
  var templateDocument = (firstTargetNode || template || {}).ownerDocument;
  var templateEngineToUse = (options$$1.templateEngine || _templateEngine);
  var renderedNodesArray = templateEngineToUse.renderTemplate(template, bindingContext$$1, options$$1, templateDocument);

    // Loosely check result is an array of DOM nodes
  if ((typeof renderedNodesArray.length !== 'number') || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType !== 'number')) { throw new Error('Template engine must return an array of DOM nodes') }

  var haveAddedNodesToParent = false;
  switch (renderMode) {
    case 'replaceChildren':
      setDomNodeChildren$1(targetNodeOrNodeArray, renderedNodesArray);
      haveAddedNodesToParent = true;
      break
    case 'replaceNode':
      replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray);
      haveAddedNodesToParent = true;
      break
    case 'ignoreTargetNode': break
    default:
      throw new Error('Unknown renderMode: ' + renderMode)
  }

  if (haveAddedNodesToParent) {
    activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext$$1, afterBindingCallback);
    if (options$$1.afterRender) { ignore(options$$1.afterRender, null, [renderedNodesArray, bindingContext$$1['$data']]); }
  }

  return renderedNodesArray
}

function resolveTemplateName (template, data$$1, context) {
    // The template can be specified as:
  if (isObservable(template)) {
    // 1. An observable, with string value
    return template()
  } else if (typeof template === 'function') {
    // 2. A function of (data, context) returning a string
    return template(data$$1, context)
  } else {
    // 3. A string
    return template
  }
}

function renderTemplate (template, dataOrBindingContext, options$$1, targetNodeOrNodeArray, renderMode, afterBindingCallback) {
  options$$1 = options$$1 || {};
  if ((options$$1.templateEngine || _templateEngine) === undefined) { throw new Error('Set a template engine before calling renderTemplate') }
  renderMode = renderMode || 'replaceChildren';

  if (targetNodeOrNodeArray) {
    var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

    var whenToDispose = function () { return (!firstTargetNode) || !domNodeIsAttachedToDocument(firstTargetNode) }; // Passive disposal (on next evaluation)
    var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode === 'replaceNode') ? firstTargetNode.parentNode : firstTargetNode;

    return computed( // So the DOM is automatically updated when any dependency changes
      function () {
        // Ensure we've got a proper binding context to work with
        var bindingContext$$1 = (dataOrBindingContext && (dataOrBindingContext instanceof bindingContext))
              ? dataOrBindingContext
              : new bindingContext(dataOrBindingContext, null, null, null, { 'exportDependencies': true });

        var templateName = resolveTemplateName(template, bindingContext$$1.$data, bindingContext$$1);
        const renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext$$1, options$$1, afterBindingCallback);

        if (renderMode === 'replaceNode') {
          targetNodeOrNodeArray = renderedNodesArray;
          firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
        }
      },
      null,
      { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: activelyDisposeWhenNodeIsRemoved }
    )
  } else {
        // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
    return memoize(function (domNode) {
      renderTemplate(template, dataOrBindingContext, options$$1, domNode, 'replaceNode');
    })
  }
}

function renderTemplateForEach (template, arrayOrObservableArray, options$$1, targetNode, parentBindingContext, afterBindingCallback) {
    // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
    // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
  var arrayItemContext;

    // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
  function executeTemplateForArrayItem (arrayValue, index) {
        // Support selecting template as a function of the data being rendered
    arrayItemContext = parentBindingContext['createChildContext'](arrayValue, options$$1['as'], function (context) {
      context['$index'] = index;
    });

    var templateName = resolveTemplateName(template, arrayValue, arrayItemContext);
    return executeTemplate(null, 'ignoreTargetNode', templateName, arrayItemContext, options$$1, afterBindingCallback)
  }

    // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
  var activateBindingsCallback = function (arrayValue, addedNodesArray /*, index */) {
    activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext, afterBindingCallback);
    if (options$$1['afterRender']) { options$$1['afterRender'](addedNodesArray, arrayValue); }

        // release the "cache" variable, so that it can be collected by
        // the GC when its value isn't used from within the bindings anymore.
    arrayItemContext = null;
  };

  return computed(function () {
    var unwrappedArray = unwrap(arrayOrObservableArray) || [];
    if (typeof unwrappedArray.length !== 'number') { unwrappedArray = [unwrappedArray]; }

    // Filter out any entries marked as destroyed
    var filteredArray = arrayFilter(unwrappedArray, function (item) {
      return options$$1['includeDestroyed'] || item === undefined || item === null || !unwrap(item['_destroy'])
    });

    // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
    // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
    ignore(setDomNodeChildrenFromArrayMapping, null, [targetNode, filteredArray, executeTemplateForArrayItem, options$$1, activateBindingsCallback]);
  }, null, { disposeWhenNodeIsRemoved: targetNode })
}

let templateComputedDomDataKey = nextKey();

class TemplateBindingHandler extends AsyncBindingHandler {
  constructor (params) {
    super(params);
    const element = this.$element;
    const bindingValue = unwrap(this.value);
    let container;

    // Expose 'conditional' for `else` chaining.
    set(element, 'conditional', {
      elseChainSatisfied: observable(true)
    });

    // Support anonymous templates
    if (typeof bindingValue === 'string' || bindingValue.name) {
            // It's a named template - clear the element
      emptyNode(element);
    } else if ('nodes' in bindingValue) {
            // We've been given an array of DOM nodes. Save them as the template source.
            // There is no known use case for the node array being an observable array (if the output
            // varies, put that behavior *into* your template - that's what templates are for), and
            // the implementation would be a mess, so assert that it's not observable.
      var nodes = bindingValue.nodes || [];
      if (isObservable(nodes)) {
        throw new Error('The "nodes" option must be a plain, non-observable array.')
      }
      container = moveCleanedNodesToContainerElement(nodes); // This also removes the nodes from their current parent
      new anonymousTemplate(element)['nodes'](container);
    } else {
            // It's an anonymous template - store the element contents, then clear the element
      const templateNodes = childNodes(element);
      container = moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
      new anonymousTemplate(element).nodes(container);
    }
    this.computed(this.onValueChange.bind(this));
  }

  onValueChange () {
    const element = this.$element;
    const bindingContext$$1 = this.$context;
    var value = this.value;
    var options$$1 = unwrap(value);
    var shouldDisplay = true;
    var templateComputed = null;
    var elseChainSatisfied = get(element, 'conditional').elseChainSatisfied;
    var templateName;

    if (typeof options$$1 === 'string') {
      templateName = value;
      options$$1 = {};
    } else {
      templateName = options$$1.name;

      // Support "if"/"ifnot" conditions
      if ('if' in options$$1) {
        shouldDisplay = unwrap(options$$1.if);
      }

      if (shouldDisplay && 'ifnot' in options$$1) {
        shouldDisplay = !unwrap(options$$1.ifnot);
      }
    }

    if ('foreach' in options$$1) {
      // Render once for each data point (treating data set as empty if shouldDisplay==false)
      var dataArray = (shouldDisplay && options$$1.foreach) || [];
      templateComputed = renderTemplateForEach(templateName || element, dataArray, options$$1, element, bindingContext$$1, this.completeBinding);

      elseChainSatisfied((unwrap(dataArray) || []).length !== 0);
    } else if (shouldDisplay) {
      // Render once for this single data point (or use the viewModel if no data was provided)
      var innerBindingContext = ('data' in options$$1)
        ? bindingContext$$1.createStaticChildContext(options$$1.data, options$$1.as)  // Given an explitit 'data' value, we create a child binding context for it
        : bindingContext$$1;                                                        // Given no explicit 'data' value, we retain the same binding context
      templateComputed = renderTemplate(templateName || element, innerBindingContext, options$$1, element, undefined, this.completeBinding);
      elseChainSatisfied(true);
    } else {
      emptyNode(element);
      elseChainSatisfied(false);
    }

    // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
    this.disposeOldComputedAndStoreNewOne(element, templateComputed);
  }

  disposeOldComputedAndStoreNewOne (element, newComputed) {
    let oldComputed = get(element, templateComputedDomDataKey);
    if (oldComputed && (typeof oldComputed.dispose === 'function')) { oldComputed.dispose(); }
    set(element, templateComputedDomDataKey, (newComputed && newComputed.isActive()) ? newComputed : undefined);
  }

  get controlsDescendants () { return true }
  static get allowVirtualElements () { return true }
}

function nativeTemplateEngine () {
}

nativeTemplateEngine.prototype = new templateEngine();
nativeTemplateEngine.prototype.constructor = nativeTemplateEngine;
nativeTemplateEngine.prototype.renderTemplateSource = function(templateSource, bindingContext, options$$1, templateDocument) {
    var useNodesIfAvailable = !(ieVersion < 9), // IE<9 cloneNode doesn't work properly
        templateNodesFunc = useNodesIfAvailable ? templateSource.nodes : null,
        templateNodes = templateNodesFunc ? templateSource.nodes() : null;

    if (templateNodes) {
        return makeArray(templateNodes.cloneNode(true).childNodes);
    } else {
        var templateText = templateSource.text();
        return parseHtmlFragment(templateText, templateDocument);
    }
};


nativeTemplateEngine.instance = new nativeTemplateEngine();
setTemplateEngine(nativeTemplateEngine.instance);

// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
class TemplateForEachBindingHandler extends TemplateBindingHandler {
  get value () {
    const modelValue = this.valueAccessor();
    const unwrappedValue = peek(modelValue);    // Unwrap without setting a dependency here

        // If unwrappedValue is the array, pass in the wrapped value on its own
        // The value will be unwrapped and tracked within the template binding
        // (See https://github.com/SteveSanderson/knockout/issues/523)
    if (!unwrappedValue || typeof unwrappedValue.length === 'number') {
      return { foreach: modelValue, templateEngine: nativeTemplateEngine.instance }
    }

    // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
    unwrap(modelValue);
    return {
      foreach: unwrappedValue.data,
      as: unwrappedValue.as,
      includeDestroyed: unwrappedValue.includeDestroyed,
      afterAdd: unwrappedValue.afterAdd,
      beforeRemove: unwrappedValue.beforeRemove,
      afterRender: unwrappedValue.afterRender,
      beforeMove: unwrappedValue.beforeMove,
      afterMove: unwrappedValue.afterMove,
      templateEngine: nativeTemplateEngine.instance
    }
  }
}

//    'let': letBinding,
//    template: template,

const bindings$1 = {
  foreach: TemplateForEachBindingHandler,
  template: TemplateBindingHandler
};

/**
 * Test a node for whether it represents an "else" condition.
 * @param  {HTMLElement}  node to be tested
 * @return {Boolean}      true when
 *
 * Matches <!-- else -->
 */
function isElseNode (node) {
  return node.nodeType === 8 &&
        node.nodeValue.trim().toLowerCase() === 'else'
}

function detectElse (element) {
  var children = childNodes(element);
  for (var i = 0, j = children.length; i < j; ++i) {
    if (isElseNode(children[i])) { return true }
  }
  return false
}

/**
 * Clone the nodes, returning `ifNodes`, `elseNodes`
 * @param  {HTMLElement} element The nodes to be cloned
 * @param  {boolean}    hasElse short-circuit to speed up the inner-loop.
 * @return {object}         Containing the cloned nodes.
 */
function cloneIfElseNodes (element, hasElse) {
  const children = childNodes(element);
  const ifNodes = [];
  const elseNodes = [];
  let target = ifNodes;

  for (var i = 0, j = children.length; i < j; ++i) {
    if (hasElse && isElseNode(children[i])) {
      target = elseNodes;
      hasElse = false;
    } else {
      target.push(cleanNode(children[i].cloneNode(true)));
    }
  }

  return { ifNodes, elseNodes }
}

/**
 * Create a DOMbinding that controls DOM nodes presence
 *
 * Covers e.g.
 *
 * 1. DOM Nodes contents
 *
 * <div data-bind='if: x'>
 * <!-- else --> ... an optional "if"
 * </div>
 *
 * 2. Virtual elements
 *
 * <!-- ko if: x -->
 * <!-- else -->
 * <!-- /ko -->
 *
 * 3. Else binding
 * <div data-bind='if: x'></div>
 * <div data-bind='else'></div>
 */
class ConditionalBindingHandler extends AsyncBindingHandler {
  constructor (params) {
    super(params);
    this.hasElse = detectElse(this.$element);
    const elseChainSatisfied = this.completesElseChain = observable();

    set(this.$element, 'conditional', { elseChainSatisfied });

    this.computed(this.render.bind(this));
  }

  get elseChainIsAlreadySatisfied () { return false }
  get needsRefresh () {
    return this.isFirstRender || this.shouldDisplayIf !== this.didDisplayOnLastUpdate
  }
  get shouldDisplayIf () { return !!unwrap(this.value) }

  render () {
    const isFirstRender = !this.ifElseNodes;
    let shouldDisplayIf = this.shouldDisplayIf;
    let needsRefresh = this.needsRefresh;

    if (this.elseChainIsAlreadySatisfied) {
      shouldDisplayIf = false;
      needsRefresh = isFirstRender || this.didDisplayOnLastUpdate;
      this.completesElseChain(true);
    } else {
      this.completesElseChain(this.shouldDisplayIf);
    }

    if (!needsRefresh) { return }

    if (isFirstRender && (getDependenciesCount() || this.hasElse)) {
      this.ifElseNodes = cloneIfElseNodes(this.$element, this.hasElse);
    }

    if (shouldDisplayIf) {
      if (!isFirstRender || this.hasElse) {
        setDomNodeChildren$1(this.$element, cloneNodes(this.ifElseNodes.ifNodes));
      }
    } else if (this.ifElseNodes) {
      setDomNodeChildren$1(this.$element, cloneNodes(this.ifElseNodes.elseNodes));
    } else {
      emptyNode(this.$element);
    }

    applyBindingsToDescendants(this.bindingContext, this.$element)
      .then(this.completeBinding);

    this.didDisplayOnLastUpdate = shouldDisplayIf;
  }

  get bindingContext () { return this.$context }
  get controlsDescendants () { return true }
  static get allowVirtualElements () { return true }
}

class IfBindingHandler extends ConditionalBindingHandler {}

class UnlessBindingHandler extends ConditionalBindingHandler {
  get shouldDisplayIf () { return !super.shouldDisplayIf }
}

class ElseBindingHandler extends ConditionalBindingHandler {
  get shouldDisplayIf () { return super.shouldDisplayIf || this.value === undefined }

  /**
   * Return any conditional that precedes the given node.
   * @return {object}      { elseChainSatisfied: observable }
   */
  get elseChainIsAlreadySatisfied () {
    if (!this._elseChain) { this._elseChain = this.readElseChain(); }
    return unwrap(this._elseChain.elseChainSatisfied)
  }

  readElseChain () {
    let node = this.$element;
    do {
      node = node.previousSibling;
    } while (node && node.nodeType !== 1 && node.nodeType !== 8)

    if (!node) { return false }

    if (node.nodeType === 8) {
      node = previousSibling(node);
    }

    return get(node, 'conditional') || {}
  }
}

class WithBindingHandler extends ConditionalBindingHandler {
  get needsRefresh () { return true }
  get bindingContext () {
    return this.$context.createStaticChildContext(this.value)
  }
}

const bindings$2 = {
  'if': IfBindingHandler,
  'with': WithBindingHandler,
  ifnot: UnlessBindingHandler,
  unless: UnlessBindingHandler,
  'else': ElseBindingHandler,
  'elseif': ElseBindingHandler
};

// index.js
// --------
// Fast For Each
//
// Employing sound techniques to make a faster Knockout foreach binding.
// --------

//      Utilities
const MAX_LIST_SIZE = 9007199254740991;

// from https://github.com/jonschlinkert/is-plain-object
function isPlainObject (o) {
  return !!o && typeof o === 'object' && o.constructor === Object
}

const supportsDocumentFragment = document && typeof document.createDocumentFragment === 'function';

// Get a copy of the (possibly virtual) child nodes of the given element,
// put them into a container, then empty the given node.
function makeTemplateNode (sourceNode) {
  var container = document.createElement('div');
  var parentNode;
  if (sourceNode.content) {
    // For e.g. <template> tags
    parentNode = sourceNode.content;
  } else if (sourceNode.tagName === 'SCRIPT') {
    parentNode = document.createElement('div');
    parentNode.innerHTML = sourceNode.text;
  } else {
    // Anything else e.g. <div>
    parentNode = sourceNode;
  }
  arrayForEach(childNodes(parentNode), function (child) {
    // FIXME - This cloneNode could be expensive; we may prefer to iterate over the
    // parentNode children in reverse (so as not to foul the indexes as childNodes are
    // removed from parentNode when inserted into the container)
    if (child) {
      container.insertBefore(child.cloneNode(true), null);
    }
  });
  return container
}

// Mimic a KO change item 'add'
function valueToChangeAddItem (value, index) {
  return {
    status: 'added',
    value: value,
    index: index
  }
}

// store a symbol for caching the pending delete info index in the data item objects
const PENDING_DELETE_INDEX_SYM = createSymbolOrString('_ko_ffe_pending_delete_index');

// Extend the given context with a $index (passed in via the createChildContext)
function extend$context (include$index, $context) {
  if (include$index) { $context.$index = observable(); }
  $context.$list = this.data;
}

class ForEachBinding extends AsyncBindingHandler {
  // NOTE: valid valueAccessors include:
  //    []
  //    observable([])
  //    observableArray([])
  //    computed
  //    {data: array, name: string, as: string}

  constructor (params) {
    super(params);
    const settings = {};
    if (isPlainObject(this.value)) {
      Object.assign(settings, this.value);
    }

    this.noIndex = settings.noIndex || this.allBindings.get('noIndex');
    this.as = settings.as || this.allBindings.get('as');

    this.data = settings.data || (unwrap(this.$context.$rawData) === this.value ? this.$context.$rawData : this.value);

    this.container = isStartComment(this.$element)
                     ? this.$element.parentNode : this.$element;
    this.generateContext = this.createContextGenerator(this.as, !this.noIndex);
    if (this.noIndex) { this.updateIndexes = false; }

    this.templateNode = makeTemplateNode(
      settings.templateNode || (settings.name
        ? document.getElementById(settings.name).cloneNode(true)
        : this.$element)
    )

    ;['afterAdd', 'beforeRemove', 'afterQueueFlush', 'beforeQueueFlush']
      .forEach(p => { this[p] = settings[p] || this.allBindings.get(p); });

    this.changeQueue = [];
    this.firstLastNodesList = [];
    this.indexesToDelete = [];
    this.rendering_queued = false;
    this.pendingDeletes = [];

    // Expose the conditional so that if the `foreach` data is empty, successive
    // 'else' bindings will appear.
    this.isNotEmpty = observable(Boolean(unwrap(this.data).length));
    set(this.$element, 'conditional', {
      elseChainSatisfied: this.isNotEmpty
    });

    // Remove existing content.
    emptyNode(this.$element);

    // Prime content
    const primeData = unwrap(this.data);
    if (primeData.map) {
      this.onArrayChange(primeData.map(valueToChangeAddItem), true);
    } else {
      this.completeBinding();
    }

    // Watch for changes
    if (isObservable(this.data)) {
      if (!this.data.indexOf) {
        // Make sure the observable is trackable.
        this.data = this.data.extend({ trackArrayChanges: true });
      }
      this.changeSubs = this.data.subscribe(this.onArrayChange, this, 'arrayChange');
    }
  }

  dispose () {
    if (this.changeSubs) {
      this.changeSubs.dispose();
    }
    this.flushPendingDeletes();
  }

  // If the array changes we register the change.
  onArrayChange (changeSet, isInitial) {
    var changeMap = {
      added: [],
      deleted: []
    };

    // knockout array change notification index handling:
    // - sends the original array indexes for deletes
    // - sends the new array indexes for adds
    // - sorts them all by index in ascending order
    // because of this, when checking for possible batch additions, any delete can be between to adds with neighboring indexes, so only additions should be checked
    for (var i = 0, len = changeSet.length; i < len; i++) {
      if (changeMap.added.length && changeSet[i].status === 'added') {
        var lastAdd = changeMap.added[changeMap.added.length - 1];
        var lastIndex = lastAdd.isBatch ? lastAdd.index + lastAdd.values.length - 1 : lastAdd.index;
        if (lastIndex + 1 === changeSet[i].index) {
          if (!lastAdd.isBatch) {
            // transform the last addition into a batch addition object
            lastAdd = {
              isBatch: true,
              status: 'added',
              index: lastAdd.index,
              values: [lastAdd.value]
            };
            changeMap.added.splice(changeMap.added.length - 1, 1, lastAdd);
          }
          lastAdd.values.push(changeSet[i].value);
          continue
        }
      }

      changeMap[changeSet[i].status].push(changeSet[i]);
    }

    if (changeMap.deleted.length > 0) {
      this.changeQueue.push.apply(this.changeQueue, changeMap.deleted);
      this.changeQueue.push({ status: 'clearDeletedIndexes' });
    }

    this.changeQueue.push.apply(this.changeQueue, changeMap.added);
    // Once a change is registered, the ticking count-down starts for the processQueue.
    if (this.changeQueue.length > 0 && !this.rendering_queued) {
      this.rendering_queued = true;
      if (isInitial) {
        this.processQueue();
      } else {
        ForEachBinding.animateFrame.call(window, () => this.processQueue());
      }
    }
  }

  startQueueFlush () {
    // Callback so folks can do things before the queue flush.
    if (typeof this.beforeQueueFlush === 'function') {
      this.beforeQueueFlush(this.changeQueue);
    }
  }

  endQueueFlush () {
    // Callback so folks can do things.
    if (typeof this.afterQueueFlush === 'function') {
      this.afterQueueFlush(this.changeQueue);
    }
  }

  // Reflect all the changes in the queue in the DOM, then wipe the queue.
  processQueue () {
    var isEmpty = !unwrap(this.data).length;
    var lowestIndexChanged = MAX_LIST_SIZE;

    this.startQueueFlush();

    arrayForEach(this.changeQueue, (changeItem) => {
      if (typeof changeItem.index === 'number') {
        lowestIndexChanged = Math.min(lowestIndexChanged, changeItem.index);
      }
      this[changeItem.status](changeItem);
    });
    this.flushPendingDeletes();
    this.rendering_queued = false;

    // Update our indexes.
    if (this.updateIndexes) { this.updateIndexes(lowestIndexChanged); }

    this.endQueueFlush();
    this.changeQueue = [];

    // Update the conditional exposed on the domData
    if (isEmpty !== !this.isNotEmpty()) {
      this.isNotEmpty(!isEmpty);
    }
  }

  /**
   * Return a function that generates the context for a given node.
   *
   * We generate a single function that reduces our inner-loop calculations,
   * which has a good chance of being optimized by the browser.
   *
   * @param  {string} as  The name given to each item in the list
   * @param  {bool} index Whether to calculate indexes
   * @return {function}   A function(dataValue) that returns the context
   */
  createContextGenerator (as, index) {
    var $context = this.$context;
    switch ((as && 1) | (index && 2)) {
      case 0: // no-as & no-index
        return function (v) {
          return $context.createChildContext(v, null, extend$context.bind(this, false))
        }

      case 1: // as + no-index
        return function (v) {
          var obj = { $index: undefined, $list: this.data };
          obj[as] = v;
          return $context.extend(obj)
        }

      case 2: // no-as + index
        return function (v) {
          return $context.createChildContext(v, null, extend$context.bind(this, true))
        }

      case 3: // as + index
        return function (v) {
          var obj = { $index: observable(), $list: this.data };
          obj[as] = v;
          return $context.extend(obj)
        }
    }
  }

  // Process a changeItem with {status: 'added', ...}
  added (changeItem) {
    var index = changeItem.index;
    var valuesToAdd = changeItem.isBatch ? changeItem.values : [changeItem.value];
    var referenceElement = this.getLastNodeBeforeIndex(index);
    // gather all childnodes for a possible batch insertion
    const allChildNodes = [];
    const asyncBindingResults = [];
    var children;

    for (var i = 0, len = valuesToAdd.length; i < len; ++i) {
      // we check if we have a pending delete with reusable nodesets for this data, and if yes, we reuse one nodeset
      var pendingDelete = this.getPendingDeleteFor(valuesToAdd[i]);
      if (pendingDelete && pendingDelete.nodesets.length) {
        children = pendingDelete.nodesets.pop();
      } else {
        var templateClone = this.templateNode.cloneNode(true);
        // Apply bindings first, and then process child nodes,
        // because bindings can add childnodes.
        const bindingResult = applyBindingsToDescendants(
          this.generateContext(valuesToAdd[i]), templateClone
        );

        asyncBindingResults.push(bindingResult);

        children = childNodes(templateClone);
      }

      // Note discussion at https://github.com/angular/angular.js/issues/7851
      allChildNodes.push.apply(allChildNodes, Array.prototype.slice.call(children));
      this.firstLastNodesList.splice(index + i, 0, { first: children[0], last: children[children.length - 1] });
    }

    if (typeof this.afterAdd === 'function') {
      this.afterAdd({
        nodeOrArrayInserted: this.insertAllAfter(allChildNodes, referenceElement),
        foreachInstance: this
      });
    } else {
      this.insertAllAfter(allChildNodes, referenceElement);
    }

    this.completeBinding(options.Promise.all(asyncBindingResults));
  }

  getNodesForIndex (index) {
    let result = [];
    let ptr = this.firstLastNodesList[index].first;
    let last = this.firstLastNodesList[index].last;
    result.push(ptr);
    while (ptr && ptr !== last) {
      ptr = ptr.nextSibling;
      result.push(ptr);
    }
    return result
  }

  getLastNodeBeforeIndex (index) {
    if (index < 1 || index - 1 >= this.firstLastNodesList.length) { return null }
    return this.firstLastNodesList[index - 1].last
  }

  /**
   * Get the active (focused) node, if it's a child of the given node.
   */
  activeChildElement (node) {
    var active = document.activeElement;
    if (domNodeIsContainedBy(active, node)) {
      return active
    }
  }

  insertAllAfter (nodeOrNodeArrayToInsert, insertAfterNode) {
    let frag;
    let len;
    let i;
    let active = null;
    let containerNode = this.$element;

    // Poor man's node and array check.
    if (nodeOrNodeArrayToInsert.nodeType === undefined && nodeOrNodeArrayToInsert.length === undefined) {
      throw new Error('Expected a single node or a node array')
    }
    if (nodeOrNodeArrayToInsert.nodeType !== undefined) {
      active = this.activeChildElement(nodeOrNodeArrayToInsert);
      insertAfter(containerNode, nodeOrNodeArrayToInsert, insertAfterNode);
      return [nodeOrNodeArrayToInsert]
    } else if (nodeOrNodeArrayToInsert.length === 1) {
      active = this.activeChildElement(nodeOrNodeArrayToInsert[0]);
      insertAfter(containerNode, nodeOrNodeArrayToInsert[0], insertAfterNode);
    } else if (supportsDocumentFragment) {
      frag = document.createDocumentFragment();
      for (i = 0, len = nodeOrNodeArrayToInsert.length; i !== len; ++i) {
        active = active || this.activeChildElement(nodeOrNodeArrayToInsert[i]);
        frag.appendChild(nodeOrNodeArrayToInsert[i]);
      }
      insertAfter(containerNode, frag, insertAfterNode);
    } else {
      // Nodes are inserted in reverse order - pushed down immediately after
      // the last node for the previous item or as the first node of element.
      for (i = nodeOrNodeArrayToInsert.length - 1; i >= 0; --i) {
        active = active || this.activeChildElement(nodeOrNodeArrayToInsert[i]);
        var child = nodeOrNodeArrayToInsert[i];
        if (!child) { break }
        insertAfter(containerNode, child, insertAfterNode);
      }
    }

    if (active) { active.focus(); }

    return nodeOrNodeArrayToInsert
  }

  // checks if the deleted data item should be handled with delay for a possible reuse at additions
  shouldDelayDeletion (data$$1) {
    return data$$1 && (typeof data$$1 === 'object' || typeof data$$1 === 'function')
  }

  // gets the pending deletion info for this data item
  getPendingDeleteFor (data$$1) {
    var index = data$$1 && data$$1[PENDING_DELETE_INDEX_SYM];
    if (index === undefined) return null
    return this.pendingDeletes[index]
  }

  // tries to find the existing pending delete info for this data item, and if it can't, it registeres one
  getOrCreatePendingDeleteFor (data$$1) {
    var pd = this.getPendingDeleteFor(data$$1);
    if (pd) {
      return pd
    }
    pd = {
      data: data$$1,
      nodesets: []
    };
    data$$1[PENDING_DELETE_INDEX_SYM] = this.pendingDeletes.length;
    this.pendingDeletes.push(pd);
    return pd
  }

  // Process a changeItem with {status: 'deleted', ...}
  deleted (changeItem) {
    // if we should delay the deletion of this data, we add the nodeset to the pending delete info object
    if (this.shouldDelayDeletion(changeItem.value)) {
      let pd = this.getOrCreatePendingDeleteFor(changeItem.value);
      pd.nodesets.push(this.getNodesForIndex(changeItem.index));
    } else { // simple data, just remove the nodes
      this.removeNodes(this.getNodesForIndex(changeItem.index));
    }
    this.indexesToDelete.push(changeItem.index);
  }

  // removes a set of nodes from the DOM
  removeNodes (nodes) {
    if (!nodes.length) { return }

    function removeFn () {
      var parent = nodes[0].parentNode;
      for (var i = nodes.length - 1; i >= 0; --i) {
        cleanNode(nodes[i]);
        parent.removeChild(nodes[i]);
      }
    }

    if (this.beforeRemove) {
      var beforeRemoveReturn = this.beforeRemove({
        nodesToRemove: nodes, foreachInstance: this
      }) || {};
      // If beforeRemove returns a `then`–able e.g. a Promise, we remove
      // the nodes when that thenable completes.  We pass any errors to
      // ko.onError.
      if (typeof beforeRemoveReturn.then === 'function') {
        beforeRemoveReturn.then(removeFn, options.onError);
      }
    } else {
      removeFn();
    }
  }

  // flushes the pending delete info store
  // this should be called after queue processing has finished, so that data items and remaining (not reused) nodesets get cleaned up
  // we also call it on dispose not to leave any mess
  flushPendingDeletes () {
    for (let i = 0, len = this.pendingDeletes.length; i !== len; ++i) {
      var pd = this.pendingDeletes[i];
      while (pd.nodesets.length) {
        this.removeNodes(pd.nodesets.pop());
      }
      if (pd.data && pd.data[PENDING_DELETE_INDEX_SYM] !== undefined) { delete pd.data[PENDING_DELETE_INDEX_SYM]; }
    }
    this.pendingDeletes = [];
  }

  // We batch our deletion of item indexes in our parallel array.
  // See brianmhunt/knockout-fast-foreach#6/#8
  clearDeletedIndexes () {
    // We iterate in reverse on the presumption (following the unit tests) that KO's diff engine
    // processes diffs (esp. deletes) monotonically ascending i.e. from index 0 -> N.
    for (let i = this.indexesToDelete.length - 1; i >= 0; --i) {
      this.firstLastNodesList.splice(this.indexesToDelete[i], 1);
    }
    this.indexesToDelete = [];
  }

  updateIndexes (fromIndex) {
    let ctx;
    for (let i = fromIndex, len = this.firstLastNodesList.length; i < len; ++i) {
      ctx = this.getContextStartingFrom(this.firstLastNodesList[i].first);
      if (ctx) { ctx.$index(i); }
    }
  }

  getContextStartingFrom (node) {
    let ctx;
    while (node) {
      ctx = contextFor(node);
      if (ctx) { return ctx }
      node = node.nextSibling;
    }
  }

  /**
   * Set whether the binding is always synchronous.
   * Useful during testing.
   */
  static setSync (toggle) {
    if (toggle) {
      ForEachBinding.animateFrame = function (frame) { frame(); };
    } else {
      ForEachBinding.animateFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || window.msRequestAnimationFrame ||
        function (cb) { return window.setTimeout(cb, 1000 / 60) };
    }
  }

  get controlsDescendants () { return true }
  static get allowVirtualElements () { return true }

  /* TODO: Remove; for legacy/testing */
  static get ForEach () { return this }
  static get PENDING_DELETE_INDEX_SYM () { return PENDING_DELETE_INDEX_SYM }
}

var bindings$3 = {
  foreach: ForEachBinding
};

// By default, foreach will be async.
ForEachBinding.setSync(false);

var sproto = String.prototype;

var filters = {};

// Convert value to uppercase
filters.uppercase = function(value) {
    return sproto.toUpperCase.call(unwrap(value));
};

// Convert value to lowercase
filters.lowercase = function(value) {
    return sproto.toLowerCase.call(unwrap(value));
};

// Return default value if the input value is empty or null
filters['default'] = function (value, defaultValue) {
    value = unwrap(value);
    if (typeof value === "function") {
        return value;
    }
    if (typeof value === "string") {
        return sproto.trim.call(value) === '' ? defaultValue : value;
    }
    return value == null || value.length == 0 ? defaultValue : value;
};

// Return the value with the search string replaced with the replacement string
filters.replace = function(value, search, replace) {
    return sproto.replace.call(unwrap(value), search, replace);
};

filters.fit = function(value, length, replacement, trimWhere) {
    value = unwrap(value);
    if (length && ('' + value).length > length) {
        replacement = '' + (replacement || '...');
        length = length - replacement.length;
        value = '' + value;
        switch (trimWhere) {
            case 'left':
                return replacement + value.slice(-length);
            case 'middle':
                var leftLen = Math.ceil(length / 2);
                return value.substr(0, leftLen) + replacement + value.slice(leftLen-length);
            default:
                return value.substr(0, length) + replacement;
        }
    } else {
        return value;
    }
};

// Convert a model object to JSON
filters.json = function(rootObject, space, replacer) {
       // replacer and space are optional
    return JSON.stringify(toJS(rootObject), replacer, space);
};

// Format a number using the browser's toLocaleString
filters.number = function(value) {
    return (+unwrap(value)).toLocaleString();
};

//
// Binding Handler for Components
//

var componentLoadingOperationUniqueId = 0;

class ComponentBinding extends AsyncBindingHandler {
  constructor (params) {
    super(params);
    this.originalChildNodes = makeArray(
      childNodes(this.$element)
    );
    this.computed('computeApplyComponent');
  }

  cloneTemplateIntoElement (componentName, componentDefinition, element) {
    const template = componentDefinition['template'];
    if (!template) {
      throw new Error('Component \'' + componentName + '\' has no template')
    }
    const clonedNodesArray = cloneNodes(template);
    setDomNodeChildren$1(element, clonedNodesArray);
  }

  createViewModel (componentDefinition, element, originalChildNodes, componentParams) {
    const componentViewModelFactory = componentDefinition.createViewModel;
    return componentViewModelFactory
      ? componentViewModelFactory.call(componentDefinition, componentParams, { 'element': element, 'templateNodes': originalChildNodes })
      : componentParams // Template-only component
  }

  computeApplyComponent () {
    const value = unwrap(this.value);
    let componentName;
    let componentParams;

    if (typeof value === 'string') {
      componentName = value;
    } else {
      componentName = unwrap(value['name']);
      componentParams = unwrap(value['params']);
    }

    this.latestComponentName = componentName;

    if (!componentName) {
      throw new Error('No component name specified')
    }

    this.loadingOperationId = this.currentLoadingOperationId = ++componentLoadingOperationUniqueId;
    registry.get(componentName, (defn) => this.applyComponentDefinition(componentName, componentParams, defn));
  }

  applyComponentDefinition (componentName, componentParams, componentDefinition) {
    // If this is not the current load operation for this element, ignore it.
    if (this.currentLoadingOperationId !== this.loadingOperationId ||
        this.latestComponentName !== componentName) { return }

    // Clean up previous state
    this.cleanUpState();

    const element = this.$element;

    // Instantiate and bind new component. Implicitly this cleans any old DOM nodes.
    if (!componentDefinition) {
      throw new Error('Unknown component \'' + componentName + '\'')
    }
    this.cloneTemplateIntoElement(componentName, componentDefinition, element);

    const componentViewModel = this.createViewModel(componentDefinition, element, this.originalChildNodes, componentParams);

    const ctxExtender = (ctx) => Object.assign(ctx, {
      $component: componentViewModel,
      $componentTemplateNodes: this.originalChildNodes
    });

    const childBindingContext = this.$context.createChildContext(componentViewModel, /* dataItemAlias */ undefined, ctxExtender);
    this.currentViewModel = componentViewModel;
    applyBindingsToDescendants(childBindingContext, this.$element)
      .then(this.completeBinding);
  }

  cleanUpState () {
    const currentView = this.currentViewModel;
    const currentViewDispose = currentView && currentView.dispose;
    if (typeof currentViewDispose === 'function') {
      currentViewDispose.call(currentView);
    }
    this.currentViewModel = null;
    // Any in-flight loading operation is no longer relevant, so make sure we ignore its completion
    this.currentLoadingOperationId = null;
  }

  dispose () {
    this.cleanUpState();
    super.dispose();
  }

  get controlsDescendants () { return true }
  static get allowVirtualElements () { return true }
}

var bindings$4 = { component: ComponentBinding };

/* eslint semi: 0 */
var coreUtils = {};

arrayForEach([
  'extend',
  'setTimeout',
  'arrayForEach',
  'arrayFirst',
  'arrayFilter',
  'arrayGetDistinctValues',
  'arrayIndexOf',
  'arrayMap',
  'arrayPushAll',
  'arrayRemoveItem',
  'getFormFields',
  'peekObservable',
  'postJson',
  'parseJson',
  'registerEventHandler',
  'stringifyJson',
  'range',
  'toggleDomNodeCssClass',
  'triggerEvent',
  'unwrapObservable',
  'objectForEach',
  'addOrRemoveItem',
  'setTextContent',
  'domData',
  'parseHtmlFragment',
  'setHtml',
  'compareArrays',
  'setDomNodeChildrenFromArrayMapping'
], function (coreUtil) {
  coreUtils[coreUtil] = utils[coreUtil];
});

coreUtils.domNodeDisposal = {
  addDisposeCallback: addDisposeCallback,
  otherNodeCleanerFunctions: otherNodeCleanerFunctions,
  removeDisposeCallback: removeDisposeCallback,
  removeNode: removeNode
};

extend(coreUtils, {
  setDomNodeChildrenFromArrayMapping: setDomNodeChildrenFromArrayMapping,
  unwrapObservable: unwrap,
  peekObservable: peek
});

// Create the binding provider and default bindings.
const provider = new MultiProvider({
  globals: options.bindingGlobals,
  providers: [
    new AttributeMustacheProvider(),
    new TextMustacheProvider(),
    new ComponentProvider(),
    new DataBindProvider(),
    new VirtualProvider(),
    new AttrProvider()
  ]
});

options.bindingProviderInstance = provider;

provider.bindingHandlers.set(bindings);
provider.bindingHandlers.set(bindings$1);
provider.bindingHandlers.set(bindings$2);
provider.bindingHandlers.set(bindings$3);
provider.bindingHandlers.set({ each: bindings$3.foreach });
provider.bindingHandlers.set(bindings$4);

Object.assign(options.filters, filters);

// Expose the API.
var index = {
    // --- Top-level ---
  version: '4.0.0-alpha3',
  options: options,

  extenders: extenders,
  filters: options.filters,

    // --- Utilities ---
  cleanNode: cleanNode,
  memoization: memoization,
  removeNode: removeNode,
  tasks: tasks,
  utils: coreUtils,
  dependencyDetection,
  ignoreDependencies: ignore,

    // -- Observable ---
  isObservable,
  isSubscribable,
  isWriteableObservable,
  isWritableObservable: isWriteableObservable,
  observable,
  observableArray,
  peek,
  subscribable,
  unwrap,
  toJS,
  toJSON,

    // ... Computed ...
  computed,
  isComputed,
  isPureComputed,
  pureComputed,

    // --- Templates ---
  nativeTemplateEngine,
  renderTemplate,
  setTemplateEngine,
  templateEngine,
  templateSources: { domElement, anonymousTemplate },

    // --- Binding ---
  applyBindingAccessorsToNode,
  applyBindings,
  applyBindingsToDescendants,
  applyBindingsToNode,
  bindingHandlers: provider.bindingHandlers,
  bindingProvider: provider,
  contextFor,
  dataFor,
  getBindingHandler,
  BindingHandler,
  AsyncBindingHandler,
  virtualElements: virtualElements,
  domNodeDisposal: coreUtils.domNodeDisposal,

    // --- Components ---
  components: registry
};

return index;

})));
//# sourceMappingURL=ko.js.map
