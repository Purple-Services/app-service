if(typeof Math.imul == "undefined" || (Math.imul(0xffffffff,5) == 0)) {
    Math.imul = function (a, b) {
        var ah  = (a >>> 16) & 0xffff;
        var al = a & 0xffff;
        var bh  = (b >>> 16) & 0xffff;
        var bl = b & 0xffff;
        // the shift by 0 fixes the sign on the high part
        // the final |0 converts the unsigned value into a signed value
        return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)|0);
    }
}

//! moment.js
//! version : 2.10.6
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, function () { 'use strict';

    var hookCallback;

    function utils_hooks__hooks () {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function create_utc__createUTC (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty           : false,
            unusedTokens    : [],
            unusedInput     : [],
            overflow        : -2,
            charsLeftOver   : 0,
            nullInput       : false,
            invalidMonth    : null,
            invalidFormat   : false,
            userInvalidated : false,
            iso             : false
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    function valid__isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m);
            m._isValid = !isNaN(m._d.getTime()) &&
                flags.overflow < 0 &&
                !flags.empty &&
                !flags.invalidMonth &&
                !flags.invalidWeekday &&
                !flags.nullInput &&
                !flags.invalidFormat &&
                !flags.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function valid__createInvalid (flags) {
        var m = create_utc__createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        }
        else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    var momentProperties = utils_hooks__hooks.momentProperties = [];

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = getParsingFlags(from);
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            utils_hooks__hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment (obj) {
        return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function Locale() {
    }

    var locales = {};
    var globalLocale;

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        // TODO: Find a better way to register and load all the locales in Node
        if (!locales[name] && typeof module !== 'undefined' &&
                module && module.exports) {
            try {
                oldLocale = globalLocale._abbr;
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we
                // want to undo that for lazy loaded locales
                locale_locales__getSetGlobalLocale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function locale_locales__getSetGlobalLocale (key, values) {
        var data;
        if (key) {
            if (typeof values === 'undefined') {
                data = locale_locales__getLocale(key);
            }
            else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale (name, values) {
        if (values !== null) {
            values.abbr = name;
            locales[name] = locales[name] || new Locale();
            locales[name].set(values);

            // backwards compat for now: also set the locale
            locale_locales__getSetGlobalLocale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    // returns locale data
    function locale_locales__getLocale (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeGetSet (unit, keepTime) {
        return function (value) {
            if (value != null) {
                get_set__set(this, unit, value);
                utils_hooks__hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get_set__get(this, unit);
            }
        };
    }

    function get_set__get (mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function get_set__set (mom, unit, value) {
        return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
    }

    // MOMENTS

    function getSet (units, value) {
        var unit;
        if (typeof units === 'object') {
            for (unit in units) {
                this.set(unit, units[unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                return this[units](value);
            }
        }
        return this;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(func.apply(this, arguments), token);
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;

    var regexes = {};

    function isFunction (sth) {
        // https://github.com/moment/moment/issues/2325
        return typeof sth === 'function' &&
            Object.prototype.toString.call(sth) === '[object Function]';
    }


    function addRegexToken (token, regex, strictRegex) {
        regexes[token] = isFunction(regex) ? regex : function (isStrict) {
            return (isStrict && strictRegex) ? strictRegex : regex;
        };
    }

    function getParseRegexForToken (token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        }).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
        var i, func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (typeof callback === 'number') {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken (token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  matchWord);
    addRegexToken('MMMM', matchWord);

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m) {
        return this._months[m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m) {
        return this._monthsShort[m.month()];
    }

    function localeMonthsParse (monthName, format, strict) {
        var i, mom, regex;

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = create_utc__createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
            }
            if (!strict && !this._monthsParse[i]) {
                regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                return i;
            } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth (mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth (value) {
        if (value != null) {
            setMonth(this, value);
            utils_hooks__hooks.updateOffset(this, true);
            return this;
        } else {
            return get_set__get(this, 'Month');
        }
    }

    function getDaysInMonth () {
        return daysInMonth(this.year(), this.month());
    }

    function checkOverflow (m) {
        var overflow;
        var a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
                a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
                a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    function warn(msg) {
        if (utils_hooks__hooks.suppressDeprecationWarnings === false && typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (firstTime) {
                warn(msg + '\n' + (new Error()).stack);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    utils_hooks__hooks.suppressDeprecationWarnings = false;

    var from_string__isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

    var isoDates = [
        ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
        ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
        ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
        ['GGGG-[W]WW', /\d{4}-W\d{2}/],
        ['YYYY-DDD', /\d{4}-\d{3}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
        ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
        ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
        ['HH:mm', /(T| )\d\d:\d\d/],
        ['HH', /(T| )\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
        var i, l,
            string = config._i,
            match = from_string__isoRegex.exec(string);

        if (match) {
            getParsingFlags(config).iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    config._f = isoDates[i][0];
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    // match[6] should be 'T' or space
                    config._f += (match[6] || ' ') + isoTimes[i][0];
                    break;
                }
            }
            if (string.match(matchOffset)) {
                config._f += 'Z';
            }
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);

        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }

    utils_hooks__hooks.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    function createDate (y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function createUTCDate (y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] = input.length === 2 ? utils_hooks__hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    utils_hooks__hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', false);

    function getIsLeapYear () {
        return isLeapYear(this.year());
    }

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = local__createLocal(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    // LOCALES

    function localeWeek (mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow : 0, // Sunday is the first day of the week.
        doy : 6  // The week that contains Jan 1st is the first week of the year.
    };

    function localeFirstDayOfWeek () {
        return this._week.dow;
    }

    function localeFirstDayOfYear () {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var week1Jan = 6 + firstDayOfWeek - firstDayOfWeekOfYear, janX = createUTCDate(year, 0, 1 + week1Jan), d = janX.getUTCDay(), dayOfYear;
        if (d < firstDayOfWeek) {
            d += 7;
        }

        weekday = weekday != null ? 1 * weekday : firstDayOfWeek;

        dayOfYear = 1 + week1Jan + 7 * (week - 1) - d + weekday;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    // MOMENTS

    function getSetDayOfYear (input) {
        var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
        return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
        }
        return [now.getFullYear(), now.getMonth(), now.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
            week = defaults(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    utils_hooks__hooks.ISO_8601 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === utils_hooks__hooks.ISO_8601) {
            configFromISO(config);
            return;
        }

        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                }
                else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (getParsingFlags(config).bigHour === true &&
                config._a[HOUR] <= 12 &&
                config._a[HOUR] > 0) {
            getParsingFlags(config).bigHour = undefined;
        }
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

        configFromArray(config);
        checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (!valid__isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i);
        config._a = [i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond];

        configFromArray(config);
    }

    function createFromConfig (config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig (config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || locale_locales__getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return valid__createInvalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        } else if (isDate(input)) {
            config._d = input;
        } else {
            configFromInput(config);
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (typeof(input) === 'object') {
            configFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            utils_hooks__hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
        var c = {};

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function local__createLocal (input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
         'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
         function () {
             var other = local__createLocal.apply(null, arguments);
             return other < this ? this : other;
         }
     );

    var prototypeMax = deprecate(
        'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
        function () {
            var other = local__createLocal.apply(null, arguments);
            return other > this ? this : other;
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return local__createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    function Duration (duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = locale_locales__getLocale();

        this._bubble();
    }

    function isDuration (obj) {
        return obj instanceof Duration;
    }

    function offset (token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset();
            var sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchOffset);
    addRegexToken('ZZ', matchOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(string) {
        var matches = ((string || '').match(matchOffset) || []);
        var chunk   = matches[matches.length - 1] || [];
        var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        var minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (isMoment(input) || isDate(input) ? +input : +local__createLocal(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            utils_hooks__hooks.updateOffset(res, false);
            return res;
        } else {
            return local__createLocal(input).local();
        }
    }

    function getDateOffset (m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    utils_hooks__hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime) {
        var offset = this._offset || 0,
            localAdjust;
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(input);
            }
            if (Math.abs(input) < 16) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    add_subtract__addSubtract(this, create__createDuration(input - offset, 'm'), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    utils_hooks__hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone (input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC (keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset () {
        if (this._tzm) {
            this.utcOffset(this._tzm);
        } else if (typeof this._i === 'string') {
            this.utcOffset(offsetFromString(this._i));
        }
        return this;
    }

    function hasAlignedHourOffset (input) {
        input = input ? local__createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted () {
        if (typeof this._isDSTShifted !== 'undefined') {
            return this._isDSTShifted;
        }

        var c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            var other = c._isUTC ? create_utc__createUTC(c._a) : local__createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal () {
        return !this._isUTC;
    }

    function isUtcOffset () {
        return this._isUTC;
    }

    function isUtc () {
        return this._isUTC && this._offset === 0;
    }

    var aspNetRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    var create__isoRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/;

    function create__createDuration (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms : input._milliseconds,
                d  : input._days,
                M  : input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y  : 0,
                d  : toInt(match[DATE])        * sign,
                h  : toInt(match[HOUR])        * sign,
                m  : toInt(match[MINUTE])      * sign,
                s  : toInt(match[SECOND])      * sign,
                ms : toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = create__isoRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y : parseIso(match[2], sign),
                M : parseIso(match[3], sign),
                d : parseIso(match[4], sign),
                h : parseIso(match[5], sign),
                m : parseIso(match[6], sign),
                s : parseIso(match[7], sign),
                w : parseIso(match[8], sign)
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    }

    create__createDuration.fn = Duration.prototype;

    function parseIso (inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = create__createDuration(val, period);
            add_subtract__addSubtract(this, dur, direction);
            return this;
        };
    }

    function add_subtract__addSubtract (mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            get_set__set(mom, 'Date', get_set__get(mom, 'Date') + days * isAdding);
        }
        if (months) {
            setMonth(mom, get_set__get(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            utils_hooks__hooks.updateOffset(mom, days || months);
        }
    }

    var add_subtract__add      = createAdder(1, 'add');
    var add_subtract__subtract = createAdder(-1, 'subtract');

    function moment_calendar__calendar (time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || local__createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            diff = this.diff(sod, 'days', true),
            format = diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
        return this.format(formats && formats[format] || this.localeData().calendar(format, this, local__createLocal(now)));
    }

    function clone () {
        return new Moment(this);
    }

    function isAfter (input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
        if (units === 'millisecond') {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this > +input;
        } else {
            inputMs = isMoment(input) ? +input : +local__createLocal(input);
            return inputMs < +this.clone().startOf(units);
        }
    }

    function isBefore (input, units) {
        var inputMs;
        units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
        if (units === 'millisecond') {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this < +input;
        } else {
            inputMs = isMoment(input) ? +input : +local__createLocal(input);
            return +this.clone().endOf(units) < inputMs;
        }
    }

    function isBetween (from, to, units) {
        return this.isAfter(from, units) && this.isBefore(to, units);
    }

    function isSame (input, units) {
        var inputMs;
        units = normalizeUnits(units || 'millisecond');
        if (units === 'millisecond') {
            input = isMoment(input) ? input : local__createLocal(input);
            return +this === +input;
        } else {
            inputMs = +local__createLocal(input);
            return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
        }
    }

    function diff (input, units, asFloat) {
        var that = cloneWithOffset(input, this),
            zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4,
            delta, output;

        units = normalizeUnits(units);

        if (units === 'year' || units === 'month' || units === 'quarter') {
            output = monthDiff(this, that);
            if (units === 'quarter') {
                output = output / 3;
            } else if (units === 'year') {
                output = output / 12;
            }
        } else {
            delta = this - that;
            output = units === 'second' ? delta / 1e3 : // 1000
                units === 'minute' ? delta / 6e4 : // 1000 * 60
                units === 'hour' ? delta / 36e5 : // 1000 * 60 * 60
                units === 'day' ? (delta - zoneDelta) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                units === 'week' ? (delta - zoneDelta) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                delta;
        }
        return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        return -(wholeMonthDiff + adjust);
    }

    utils_hooks__hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';

    function toString () {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function moment_format__toISOString () {
        var m = this.clone().utc();
        if (0 < m.year() && m.year() <= 9999) {
            if ('function' === typeof Date.prototype.toISOString) {
                // native implementation is ~50x faster, use it when we can
                return this.toDate().toISOString();
            } else {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        } else {
            return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        }
    }

    function format (inputString) {
        var output = formatMoment(this, inputString || utils_hooks__hooks.defaultFormat);
        return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        return create__createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
    }

    function fromNow (withoutSuffix) {
        return this.from(local__createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        return create__createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
    }

    function toNow (withoutSuffix) {
        return this.to(local__createLocal(), withoutSuffix);
    }

    function locale (key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = locale_locales__getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData () {
        return this._locale;
    }

    function startOf (units) {
        units = normalizeUnits(units);
        // the following switch intentionally omits break keywords
        // to utilize falling through the cases.
        switch (units) {
        case 'year':
            this.month(0);
            /* falls through */
        case 'quarter':
        case 'month':
            this.date(1);
            /* falls through */
        case 'week':
        case 'isoWeek':
        case 'day':
            this.hours(0);
            /* falls through */
        case 'hour':
            this.minutes(0);
            /* falls through */
        case 'minute':
            this.seconds(0);
            /* falls through */
        case 'second':
            this.milliseconds(0);
        }

        // weeks are a special case
        if (units === 'week') {
            this.weekday(0);
        }
        if (units === 'isoWeek') {
            this.isoWeekday(1);
        }

        // quarters are also special
        if (units === 'quarter') {
            this.month(Math.floor(this.month() / 3) * 3);
        }

        return this;
    }

    function endOf (units) {
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond') {
            return this;
        }
        return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
    }

    function to_type__valueOf () {
        return +this._d - ((this._offset || 0) * 60000);
    }

    function unix () {
        return Math.floor(+this / 1000);
    }

    function toDate () {
        return this._offset ? new Date(+this) : this._d;
    }

    function toArray () {
        var m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    function moment_valid__isValid () {
        return valid__isValid(this);
    }

    function parsingFlags () {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
        return getParsingFlags(this).overflow;
    }

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
    });

    // HELPERS

    function weeksInYear(year, dow, doy) {
        return weekOfYear(local__createLocal([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    // MOMENTS

    function getSetWeekYear (input) {
        var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
        return input == null ? year : this.add((input - year), 'y');
    }

    function getSetISOWeekYear (input) {
        var year = weekOfYear(this, 1, 4).year;
        return input == null ? year : this.add((input - year), 'y');
    }

    function getISOWeeksInYear () {
        return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    addFormatToken('Q', 0, 0, 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
        return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0], 10);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   matchWord);
    addRegexToken('ddd',  matchWord);
    addRegexToken('dddd', matchWord);

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config) {
        var weekday = config._locale.weekdaysParse(input);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    // LOCALES

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m) {
        return this._weekdays[m.day()];
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
        return this._weekdaysShort[m.day()];
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
        return this._weekdaysMin[m.day()];
    }

    function localeWeekdaysParse (weekdayName) {
        var i, mom, regex;

        this._weekdaysParse = this._weekdaysParse || [];

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            if (!this._weekdaysParse[i]) {
                mom = local__createLocal([2000, 1]).day(i);
                regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek (input) {
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.
        return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, function () {
        return this.hours() % 12 || 12;
    });

    function meridiem (token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PARSING

    function matchMeridiem (isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });

    // LOCALES

    function localeIsPM (input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var momentPrototype__proto = Moment.prototype;

    momentPrototype__proto.add          = add_subtract__add;
    momentPrototype__proto.calendar     = moment_calendar__calendar;
    momentPrototype__proto.clone        = clone;
    momentPrototype__proto.diff         = diff;
    momentPrototype__proto.endOf        = endOf;
    momentPrototype__proto.format       = format;
    momentPrototype__proto.from         = from;
    momentPrototype__proto.fromNow      = fromNow;
    momentPrototype__proto.to           = to;
    momentPrototype__proto.toNow        = toNow;
    momentPrototype__proto.get          = getSet;
    momentPrototype__proto.invalidAt    = invalidAt;
    momentPrototype__proto.isAfter      = isAfter;
    momentPrototype__proto.isBefore     = isBefore;
    momentPrototype__proto.isBetween    = isBetween;
    momentPrototype__proto.isSame       = isSame;
    momentPrototype__proto.isValid      = moment_valid__isValid;
    momentPrototype__proto.lang         = lang;
    momentPrototype__proto.locale       = locale;
    momentPrototype__proto.localeData   = localeData;
    momentPrototype__proto.max          = prototypeMax;
    momentPrototype__proto.min          = prototypeMin;
    momentPrototype__proto.parsingFlags = parsingFlags;
    momentPrototype__proto.set          = getSet;
    momentPrototype__proto.startOf      = startOf;
    momentPrototype__proto.subtract     = add_subtract__subtract;
    momentPrototype__proto.toArray      = toArray;
    momentPrototype__proto.toObject     = toObject;
    momentPrototype__proto.toDate       = toDate;
    momentPrototype__proto.toISOString  = moment_format__toISOString;
    momentPrototype__proto.toJSON       = moment_format__toISOString;
    momentPrototype__proto.toString     = toString;
    momentPrototype__proto.unix         = unix;
    momentPrototype__proto.valueOf      = to_type__valueOf;

    // Year
    momentPrototype__proto.year       = getSetYear;
    momentPrototype__proto.isLeapYear = getIsLeapYear;

    // Week Year
    momentPrototype__proto.weekYear    = getSetWeekYear;
    momentPrototype__proto.isoWeekYear = getSetISOWeekYear;

    // Quarter
    momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;

    // Month
    momentPrototype__proto.month       = getSetMonth;
    momentPrototype__proto.daysInMonth = getDaysInMonth;

    // Week
    momentPrototype__proto.week           = momentPrototype__proto.weeks        = getSetWeek;
    momentPrototype__proto.isoWeek        = momentPrototype__proto.isoWeeks     = getSetISOWeek;
    momentPrototype__proto.weeksInYear    = getWeeksInYear;
    momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;

    // Day
    momentPrototype__proto.date       = getSetDayOfMonth;
    momentPrototype__proto.day        = momentPrototype__proto.days             = getSetDayOfWeek;
    momentPrototype__proto.weekday    = getSetLocaleDayOfWeek;
    momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
    momentPrototype__proto.dayOfYear  = getSetDayOfYear;

    // Hour
    momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;

    // Minute
    momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;

    // Second
    momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;

    // Millisecond
    momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;

    // Offset
    momentPrototype__proto.utcOffset            = getSetOffset;
    momentPrototype__proto.utc                  = setOffsetToUTC;
    momentPrototype__proto.local                = setOffsetToLocal;
    momentPrototype__proto.parseZone            = setOffsetToParsedOffset;
    momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
    momentPrototype__proto.isDST                = isDaylightSavingTime;
    momentPrototype__proto.isDSTShifted         = isDaylightSavingTimeShifted;
    momentPrototype__proto.isLocal              = isLocal;
    momentPrototype__proto.isUtcOffset          = isUtcOffset;
    momentPrototype__proto.isUtc                = isUtc;
    momentPrototype__proto.isUTC                = isUtc;

    // Timezone
    momentPrototype__proto.zoneAbbr = getZoneAbbr;
    momentPrototype__proto.zoneName = getZoneName;

    // Deprecations
    momentPrototype__proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    momentPrototype__proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    momentPrototype__proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    momentPrototype__proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779', getSetZone);

    var momentPrototype = momentPrototype__proto;

    function moment__createUnix (input) {
        return local__createLocal(input * 1000);
    }

    function moment__createInZone () {
        return local__createLocal.apply(null, arguments).parseZone();
    }

    var defaultCalendar = {
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        nextWeek : 'dddd [at] LT',
        lastDay : '[Yesterday at] LT',
        lastWeek : '[Last] dddd [at] LT',
        sameElse : 'L'
    };

    function locale_calendar__calendar (key, mom, now) {
        var output = this._calendar[key];
        return typeof output === 'function' ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
        LTS  : 'h:mm:ss A',
        LT   : 'h:mm A',
        L    : 'MM/DD/YYYY',
        LL   : 'MMMM D, YYYY',
        LLL  : 'MMMM D, YYYY h:mm A',
        LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
        return this._ordinal.replace('%d', number);
    }

    function preParsePostFormat (string) {
        return string;
    }

    var defaultRelativeTime = {
        future : 'in %s',
        past   : '%s ago',
        s  : 'a few seconds',
        m  : 'a minute',
        mm : '%d minutes',
        h  : 'an hour',
        hh : '%d hours',
        d  : 'a day',
        dd : '%d days',
        M  : 'a month',
        MM : '%d months',
        y  : 'a year',
        yy : '%d years'
    };

    function relative__relativeTime (number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return (typeof output === 'function') ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
    }

    function locale_set__set (config) {
        var prop, i;
        for (i in config) {
            prop = config[i];
            if (typeof prop === 'function') {
                this[i] = prop;
            } else {
                this['_' + i] = prop;
            }
        }
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _ordinalParseLenient.
        this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + (/\d{1,2}/).source);
    }

    var prototype__proto = Locale.prototype;

    prototype__proto._calendar       = defaultCalendar;
    prototype__proto.calendar        = locale_calendar__calendar;
    prototype__proto._longDateFormat = defaultLongDateFormat;
    prototype__proto.longDateFormat  = longDateFormat;
    prototype__proto._invalidDate    = defaultInvalidDate;
    prototype__proto.invalidDate     = invalidDate;
    prototype__proto._ordinal        = defaultOrdinal;
    prototype__proto.ordinal         = ordinal;
    prototype__proto._ordinalParse   = defaultOrdinalParse;
    prototype__proto.preparse        = preParsePostFormat;
    prototype__proto.postformat      = preParsePostFormat;
    prototype__proto._relativeTime   = defaultRelativeTime;
    prototype__proto.relativeTime    = relative__relativeTime;
    prototype__proto.pastFuture      = pastFuture;
    prototype__proto.set             = locale_set__set;

    // Month
    prototype__proto.months       =        localeMonths;
    prototype__proto._months      = defaultLocaleMonths;
    prototype__proto.monthsShort  =        localeMonthsShort;
    prototype__proto._monthsShort = defaultLocaleMonthsShort;
    prototype__proto.monthsParse  =        localeMonthsParse;

    // Week
    prototype__proto.week = localeWeek;
    prototype__proto._week = defaultLocaleWeek;
    prototype__proto.firstDayOfYear = localeFirstDayOfYear;
    prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;

    // Day of Week
    prototype__proto.weekdays       =        localeWeekdays;
    prototype__proto._weekdays      = defaultLocaleWeekdays;
    prototype__proto.weekdaysMin    =        localeWeekdaysMin;
    prototype__proto._weekdaysMin   = defaultLocaleWeekdaysMin;
    prototype__proto.weekdaysShort  =        localeWeekdaysShort;
    prototype__proto._weekdaysShort = defaultLocaleWeekdaysShort;
    prototype__proto.weekdaysParse  =        localeWeekdaysParse;

    // Hours
    prototype__proto.isPM = localeIsPM;
    prototype__proto._meridiemParse = defaultLocaleMeridiemParse;
    prototype__proto.meridiem = localeMeridiem;

    function lists__get (format, index, field, setter) {
        var locale = locale_locales__getLocale();
        var utc = create_utc__createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function list (format, index, field, count, setter) {
        if (typeof format === 'number') {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return lists__get(format, index, field, setter);
        }

        var i;
        var out = [];
        for (i = 0; i < count; i++) {
            out[i] = lists__get(format, i, field, setter);
        }
        return out;
    }

    function lists__listMonths (format, index) {
        return list(format, index, 'months', 12, 'month');
    }

    function lists__listMonthsShort (format, index) {
        return list(format, index, 'monthsShort', 12, 'month');
    }

    function lists__listWeekdays (format, index) {
        return list(format, index, 'weekdays', 7, 'day');
    }

    function lists__listWeekdaysShort (format, index) {
        return list(format, index, 'weekdaysShort', 7, 'day');
    }

    function lists__listWeekdaysMin (format, index) {
        return list(format, index, 'weekdaysMin', 7, 'day');
    }

    locale_locales__getSetGlobalLocale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    // Side effect imports
    utils_hooks__hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', locale_locales__getSetGlobalLocale);
    utils_hooks__hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', locale_locales__getLocale);

    var mathAbs = Math.abs;

    function duration_abs__abs () {
        var data           = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days         = mathAbs(this._days);
        this._months       = mathAbs(this._months);

        data.milliseconds  = mathAbs(data.milliseconds);
        data.seconds       = mathAbs(data.seconds);
        data.minutes       = mathAbs(data.minutes);
        data.hours         = mathAbs(data.hours);
        data.months        = mathAbs(data.months);
        data.years         = mathAbs(data.years);

        return this;
    }

    function duration_add_subtract__addSubtract (duration, input, value, direction) {
        var other = create__createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days         += direction * other._days;
        duration._months       += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function duration_add_subtract__add (input, value) {
        return duration_add_subtract__addSubtract(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function duration_add_subtract__subtract (input, value) {
        return duration_add_subtract__addSubtract(this, input, value, -1);
    }

    function absCeil (number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble () {
        var milliseconds = this._milliseconds;
        var days         = this._days;
        var months       = this._months;
        var data         = this._data;
        var seconds, minutes, hours, years, monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds           = absFloor(milliseconds / 1000);
        data.seconds      = seconds % 60;

        minutes           = absFloor(seconds / 60);
        data.minutes      = minutes % 60;

        hours             = absFloor(minutes / 60);
        data.hours        = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days   = days;
        data.months = months;
        data.years  = years;

        return this;
    }

    function daysToMonths (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return days * 4800 / 146097;
    }

    function monthsToDays (months) {
        // the reverse of daysToMonths
        return months * 146097 / 4800;
    }

    function as (units) {
        var days;
        var months;
        var milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'year') {
            days   = this._days   + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            return units === 'month' ? months : months / 12;
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week'   : return days / 7     + milliseconds / 6048e5;
                case 'day'    : return days         + milliseconds / 864e5;
                case 'hour'   : return days * 24    + milliseconds / 36e5;
                case 'minute' : return days * 1440  + milliseconds / 6e4;
                case 'second' : return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
                default: throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function duration_as__valueOf () {
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs (alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asYears        = makeAs('y');

    function duration_get__get (units) {
        units = normalizeUnits(units);
        return this[units + 's']();
    }

    function makeGetter(name) {
        return function () {
            return this._data[name];
        };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
        return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
        s: 45,  // seconds to minute
        m: 45,  // minutes to hour
        h: 22,  // hours to day
        d: 26,  // days to month
        M: 11   // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function duration_humanize__relativeTime (posNegDuration, withoutSuffix, locale) {
        var duration = create__createDuration(posNegDuration).abs();
        var seconds  = round(duration.as('s'));
        var minutes  = round(duration.as('m'));
        var hours    = round(duration.as('h'));
        var days     = round(duration.as('d'));
        var months   = round(duration.as('M'));
        var years    = round(duration.as('y'));

        var a = seconds < thresholds.s && ['s', seconds]  ||
                minutes === 1          && ['m']           ||
                minutes < thresholds.m && ['mm', minutes] ||
                hours   === 1          && ['h']           ||
                hours   < thresholds.h && ['hh', hours]   ||
                days    === 1          && ['d']           ||
                days    < thresholds.d && ['dd', days]    ||
                months  === 1          && ['M']           ||
                months  < thresholds.M && ['MM', months]  ||
                years   === 1          && ['y']           || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set a threshold for relative time strings
    function duration_humanize__getSetRelativeTimeThreshold (threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        return true;
    }

    function humanize (withSuffix) {
        var locale = this.localeData();
        var output = duration_humanize__relativeTime(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var iso_string__abs = Math.abs;

    function iso_string__toISOString() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        var seconds = iso_string__abs(this._milliseconds) / 1000;
        var days         = iso_string__abs(this._days);
        var months       = iso_string__abs(this._months);
        var minutes, hours, years;

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes           = absFloor(seconds / 60);
        hours             = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years  = absFloor(months / 12);
        months %= 12;


        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        var Y = years;
        var M = months;
        var D = days;
        var h = hours;
        var m = minutes;
        var s = seconds;
        var total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        return (total < 0 ? '-' : '') +
            'P' +
            (Y ? Y + 'Y' : '') +
            (M ? M + 'M' : '') +
            (D ? D + 'D' : '') +
            ((h || m || s) ? 'T' : '') +
            (h ? h + 'H' : '') +
            (m ? m + 'M' : '') +
            (s ? s + 'S' : '');
    }

    var duration_prototype__proto = Duration.prototype;

    duration_prototype__proto.abs            = duration_abs__abs;
    duration_prototype__proto.add            = duration_add_subtract__add;
    duration_prototype__proto.subtract       = duration_add_subtract__subtract;
    duration_prototype__proto.as             = as;
    duration_prototype__proto.asMilliseconds = asMilliseconds;
    duration_prototype__proto.asSeconds      = asSeconds;
    duration_prototype__proto.asMinutes      = asMinutes;
    duration_prototype__proto.asHours        = asHours;
    duration_prototype__proto.asDays         = asDays;
    duration_prototype__proto.asWeeks        = asWeeks;
    duration_prototype__proto.asMonths       = asMonths;
    duration_prototype__proto.asYears        = asYears;
    duration_prototype__proto.valueOf        = duration_as__valueOf;
    duration_prototype__proto._bubble        = bubble;
    duration_prototype__proto.get            = duration_get__get;
    duration_prototype__proto.milliseconds   = milliseconds;
    duration_prototype__proto.seconds        = seconds;
    duration_prototype__proto.minutes        = minutes;
    duration_prototype__proto.hours          = hours;
    duration_prototype__proto.days           = days;
    duration_prototype__proto.weeks          = weeks;
    duration_prototype__proto.months         = months;
    duration_prototype__proto.years          = years;
    duration_prototype__proto.humanize       = humanize;
    duration_prototype__proto.toISOString    = iso_string__toISOString;
    duration_prototype__proto.toString       = iso_string__toISOString;
    duration_prototype__proto.toJSON         = iso_string__toISOString;
    duration_prototype__proto.locale         = locale;
    duration_prototype__proto.localeData     = localeData;

    // Deprecations
    duration_prototype__proto.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', iso_string__toISOString);
    duration_prototype__proto.lang = lang;

    // Side effect imports

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    // Side effect imports


    utils_hooks__hooks.version = '2.10.6';

    setHookCallback(local__createLocal);

    utils_hooks__hooks.fn                    = momentPrototype;
    utils_hooks__hooks.min                   = min;
    utils_hooks__hooks.max                   = max;
    utils_hooks__hooks.utc                   = create_utc__createUTC;
    utils_hooks__hooks.unix                  = moment__createUnix;
    utils_hooks__hooks.months                = lists__listMonths;
    utils_hooks__hooks.isDate                = isDate;
    utils_hooks__hooks.locale                = locale_locales__getSetGlobalLocale;
    utils_hooks__hooks.invalid               = valid__createInvalid;
    utils_hooks__hooks.duration              = create__createDuration;
    utils_hooks__hooks.isMoment              = isMoment;
    utils_hooks__hooks.weekdays              = lists__listWeekdays;
    utils_hooks__hooks.parseZone             = moment__createInZone;
    utils_hooks__hooks.localeData            = locale_locales__getLocale;
    utils_hooks__hooks.isDuration            = isDuration;
    utils_hooks__hooks.monthsShort           = lists__listMonthsShort;
    utils_hooks__hooks.weekdaysMin           = lists__listWeekdaysMin;
    utils_hooks__hooks.defineLocale          = defineLocale;
    utils_hooks__hooks.weekdaysShort         = lists__listWeekdaysShort;
    utils_hooks__hooks.normalizeUnits        = normalizeUnits;
    utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;

    var _moment = utils_hooks__hooks;

    return _moment;

}));
/*!
 * Pikaday
 *
 * Copyright © 2014 David Bushell | BSD & MIT license | https://github.com/dbushell/Pikaday
 */

(function (root, factory)
{
    'use strict';

    var moment;
    if (typeof exports === 'object') {
        // CommonJS module
        // Load moment.js as an optional dependency
        try { moment = require('moment'); } catch (e) {}
        module.exports = factory(moment);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(function (req)
        {
            // Load moment.js as an optional dependency
            var id = 'moment';
            try { moment = req(id); } catch (e) {}
            return factory(moment);
        });
    } else {
        root.Pikaday = factory(root.moment);
    }
}(this, function (moment)
{
    'use strict';

    /**
     * feature detection and helper functions
     */
    var hasMoment = typeof moment === 'function',

    hasEventListeners = !!window.addEventListener,

    document = window.document,

    sto = window.setTimeout,

    addEvent = function(el, e, callback, capture)
    {
        if (hasEventListeners) {
            el.addEventListener(e, callback, !!capture);
        } else {
            el.attachEvent('on' + e, callback);
        }
    },

    removeEvent = function(el, e, callback, capture)
    {
        if (hasEventListeners) {
            el.removeEventListener(e, callback, !!capture);
        } else {
            el.detachEvent('on' + e, callback);
        }
    },

    fireEvent = function(el, eventName, data)
    {
        var ev;

        if (document.createEvent) {
            ev = document.createEvent('HTMLEvents');
            ev.initEvent(eventName, true, false);
            ev = extend(ev, data);
            el.dispatchEvent(ev);
        } else if (document.createEventObject) {
            ev = document.createEventObject();
            ev = extend(ev, data);
            el.fireEvent('on' + eventName, ev);
        }
    },

    trim = function(str)
    {
        return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g,'');
    },

    hasClass = function(el, cn)
    {
        return (' ' + el.className + ' ').indexOf(' ' + cn + ' ') !== -1;
    },

    addClass = function(el, cn)
    {
        if (!hasClass(el, cn)) {
            el.className = (el.className === '') ? cn : el.className + ' ' + cn;
        }
    },

    removeClass = function(el, cn)
    {
        el.className = trim((' ' + el.className + ' ').replace(' ' + cn + ' ', ' '));
    },

    isArray = function(obj)
    {
        return (/Array/).test(Object.prototype.toString.call(obj));
    },

    isDate = function(obj)
    {
        return (/Date/).test(Object.prototype.toString.call(obj)) && !isNaN(obj.getTime());
    },

    isWeekend = function(date)
    {
        var day = date.getDay();
        return day === 0 || day === 6;
    },

    isLeapYear = function(year)
    {
        // solution by Matti Virkkunen: http://stackoverflow.com/a/4881951
        return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
    },

    getDaysInMonth = function(year, month)
    {
        return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    },

    setToStartOfDay = function(date)
    {
        if (isDate(date)) date.setHours(0,0,0,0);
    },

    compareDates = function(a,b)
    {
        // weak date comparison (use setToStartOfDay(date) to ensure correct result)
        return a.getTime() === b.getTime();
    },

    extend = function(to, from, overwrite)
    {
        var prop, hasProp;
        for (prop in from) {
            hasProp = to[prop] !== undefined;
            if (hasProp && typeof from[prop] === 'object' && from[prop] !== null && from[prop].nodeName === undefined) {
                if (isDate(from[prop])) {
                    if (overwrite) {
                        to[prop] = new Date(from[prop].getTime());
                    }
                }
                else if (isArray(from[prop])) {
                    if (overwrite) {
                        to[prop] = from[prop].slice(0);
                    }
                } else {
                    to[prop] = extend({}, from[prop], overwrite);
                }
            } else if (overwrite || !hasProp) {
                to[prop] = from[prop];
            }
        }
        return to;
    },

    adjustCalendar = function(calendar) {
        if (calendar.month < 0) {
            calendar.year -= Math.ceil(Math.abs(calendar.month)/12);
            calendar.month += 12;
        }
        if (calendar.month > 11) {
            calendar.year += Math.floor(Math.abs(calendar.month)/12);
            calendar.month -= 12;
        }
        return calendar;
    },

    /**
     * defaults and localisation
     */
    defaults = {

        // bind the picker to a form field
        field: null,

        // automatically show/hide the picker on `field` focus (default `true` if `field` is set)
        bound: undefined,

        // position of the datepicker, relative to the field (default to bottom & left)
        // ('bottom' & 'left' keywords are not used, 'top' & 'right' are modifier on the bottom/left position)
        position: 'bottom left',

        // automatically fit in the viewport even if it means repositioning from the position option
        reposition: true,

        // the default output format for `.toString()` and `field` value
        format: 'YYYY-MM-DD',

        // the initial date to view when first opened
        defaultDate: null,

        // make the `defaultDate` the initial selected value
        setDefaultDate: false,

        // first day of week (0: Sunday, 1: Monday etc)
        firstDay: 0,

        // the minimum/earliest date that can be selected
        minDate: null,
        // the maximum/latest date that can be selected
        maxDate: null,

        // number of years either side, or array of upper/lower range
        yearRange: 10,

        // show week numbers at head of row
        showWeekNumber: false,

        // used internally (don't config outside)
        minYear: 0,
        maxYear: 9999,
        minMonth: undefined,
        maxMonth: undefined,

        startRange: null,
        endRange: null,

        isRTL: false,

        // Additional text to append to the year in the calendar title
        yearSuffix: '',

        // Render the month after year in the calendar title
        showMonthAfterYear: false,

        // how many months are visible
        numberOfMonths: 1,

        // when numberOfMonths is used, this will help you to choose where the main calendar will be (default `left`, can be set to `right`)
        // only used for the first display or when a selected date is not visible
        mainCalendar: 'left',

        // Specify a DOM element to render the calendar in
        container: undefined,

        // internationalization
        i18n: {
            previousMonth : 'Previous Month',
            nextMonth     : 'Next Month',
            months        : ['January','February','March','April','May','June','July','August','September','October','November','December'],
            weekdays      : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
            weekdaysShort : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
        },

        // Theme Classname
        theme: null,

        // callback function
        onSelect: null,
        onOpen: null,
        onClose: null,
        onDraw: null
    },


    /**
     * templating functions to abstract HTML rendering
     */
    renderDayName = function(opts, day, abbr)
    {
        day += opts.firstDay;
        while (day >= 7) {
            day -= 7;
        }
        return abbr ? opts.i18n.weekdaysShort[day] : opts.i18n.weekdays[day];
    },

    renderDay = function(opts)
    {
        if (opts.isEmpty) {
            return '<td class="is-empty"></td>';
        }
        var arr = [];
        if (opts.isDisabled) {
            arr.push('is-disabled');
        }
        if (opts.isToday) {
            arr.push('is-today');
        }
        if (opts.isSelected) {
            arr.push('is-selected');
        }
        if (opts.isInRange) {
            arr.push('is-inrange');
        }
        if (opts.isStartRange) {
            arr.push('is-startrange');
        }
        if (opts.isEndRange) {
            arr.push('is-endrange');
        }
        return '<td data-day="' + opts.day + '" class="' + arr.join(' ') + '">' +
                 '<button class="pika-button pika-day" type="button" ' +
                    'data-pika-year="' + opts.year + '" data-pika-month="' + opts.month + '" data-pika-day="' + opts.day + '">' +
                        opts.day +
                 '</button>' +
               '</td>';
    },

    renderWeek = function (d, m, y) {
        // Lifted from http://javascript.about.com/library/blweekyear.htm, lightly modified.
        var onejan = new Date(y, 0, 1),
            weekNum = Math.ceil((((new Date(y, m, d) - onejan) / 86400000) + onejan.getDay()+1)/7);
        return '<td class="pika-week">' + weekNum + '</td>';
    },

    renderRow = function(days, isRTL)
    {
        return '<tr>' + (isRTL ? days.reverse() : days).join('') + '</tr>';
    },

    renderBody = function(rows)
    {
        return '<tbody>' + rows.join('') + '</tbody>';
    },

    renderHead = function(opts)
    {
        var i, arr = [];
        if (opts.showWeekNumber) {
            arr.push('<th></th>');
        }
        for (i = 0; i < 7; i++) {
            arr.push('<th scope="col"><abbr title="' + renderDayName(opts, i) + '">' + renderDayName(opts, i, true) + '</abbr></th>');
        }
        return '<thead>' + (opts.isRTL ? arr.reverse() : arr).join('') + '</thead>';
    },

    renderTitle = function(instance, c, year, month, refYear)
    {
        var i, j, arr,
            opts = instance._o,
            isMinYear = year === opts.minYear,
            isMaxYear = year === opts.maxYear,
            html = '<div class="pika-title">',
            monthHtml,
            yearHtml,
            prev = true,
            next = true;

        for (arr = [], i = 0; i < 12; i++) {
            arr.push('<option value="' + (year === refYear ? i - c : 12 + i - c) + '"' +
                (i === month ? ' selected': '') +
                ((isMinYear && i < opts.minMonth) || (isMaxYear && i > opts.maxMonth) ? 'disabled' : '') + '>' +
                opts.i18n.months[i] + '</option>');
        }
        monthHtml = '<div class="pika-label">' + opts.i18n.months[month] + '<select class="pika-select pika-select-month" tabindex="-1">' + arr.join('') + '</select></div>';

        if (isArray(opts.yearRange)) {
            i = opts.yearRange[0];
            j = opts.yearRange[1] + 1;
        } else {
            i = year - opts.yearRange;
            j = 1 + year + opts.yearRange;
        }

        for (arr = []; i < j && i <= opts.maxYear; i++) {
            if (i >= opts.minYear) {
                arr.push('<option value="' + i + '"' + (i === year ? ' selected': '') + '>' + (i) + '</option>');
            }
        }
        yearHtml = '<div class="pika-label">' + year + opts.yearSuffix + '<select class="pika-select pika-select-year" tabindex="-1">' + arr.join('') + '</select></div>';

        if (opts.showMonthAfterYear) {
            html += yearHtml + monthHtml;
        } else {
            html += monthHtml + yearHtml;
        }

        if (isMinYear && (month === 0 || opts.minMonth >= month)) {
            prev = false;
        }

        if (isMaxYear && (month === 11 || opts.maxMonth <= month)) {
            next = false;
        }

        if (c === 0) {
            html += '<button class="pika-prev' + (prev ? '' : ' is-disabled') + '" type="button">' + opts.i18n.previousMonth + '</button>';
        }
        if (c === (instance._o.numberOfMonths - 1) ) {
            html += '<button class="pika-next' + (next ? '' : ' is-disabled') + '" type="button">' + opts.i18n.nextMonth + '</button>';
        }

        return html += '</div>';
    },

    renderTable = function(opts, data)
    {
        return '<table cellpadding="0" cellspacing="0" class="pika-table">' + renderHead(opts) + renderBody(data) + '</table>';
    },


    /**
     * Pikaday constructor
     */
    Pikaday = function(options)
    {
        var self = this,
            opts = self.config(options);

        self._onMouseDown = function(e)
        {
            if (!self._v) {
                return;
            }
            e = e || window.event;
            var target = e.target || e.srcElement;
            if (!target) {
                return;
            }

            if (!hasClass(target, 'is-disabled')) {
                if (hasClass(target, 'pika-button') && !hasClass(target, 'is-empty')) {
                    self.setDate(new Date(target.getAttribute('data-pika-year'), target.getAttribute('data-pika-month'), target.getAttribute('data-pika-day')));
                    if (opts.bound) {
                        sto(function() {
                            self.hide();
                            if (opts.field) {
                                opts.field.blur();
                            }
                        }, 100);
                    }
                }
                else if (hasClass(target, 'pika-prev')) {
                    self.prevMonth();
                }
                else if (hasClass(target, 'pika-next')) {
                    self.nextMonth();
                }
            }
            if (!hasClass(target, 'pika-select')) {
                // if this is touch event prevent mouse events emulation
                if (e.preventDefault) {
                    e.preventDefault();
                } else {
                    e.returnValue = false;
                    return false;
                }
            } else {
                self._c = true;
            }
        };

        self._onChange = function(e)
        {
            e = e || window.event;
            var target = e.target || e.srcElement;
            if (!target) {
                return;
            }
            if (hasClass(target, 'pika-select-month')) {
                self.gotoMonth(target.value);
            }
            else if (hasClass(target, 'pika-select-year')) {
                self.gotoYear(target.value);
            }
        };

        self._onInputChange = function(e)
        {
            var date;

            if (e.firedBy === self) {
                return;
            }
            if (hasMoment) {
                date = moment(opts.field.value, opts.format);
                date = (date && date.isValid()) ? date.toDate() : null;
            }
            else {
                date = new Date(Date.parse(opts.field.value));
            }
            if (isDate(date)) {
              self.setDate(date);
            }
            if (!self._v) {
                self.show();
            }
        };

        self._onInputFocus = function()
        {
            self.show();
        };

        self._onInputClick = function()
        {
            self.show();
        };

        self._onInputBlur = function()
        {
            // IE allows pika div to gain focus; catch blur the input field
            var pEl = document.activeElement;
            do {
                if (hasClass(pEl, 'pika-single')) {
                    return;
                }
            }
            while ((pEl = pEl.parentNode));

            if (!self._c) {
                self._b = sto(function() {
                    self.hide();
                }, 50);
            }
            self._c = false;
        };

        self._onClick = function(e)
        {
            e = e || window.event;
            var target = e.target || e.srcElement,
                pEl = target;
            if (!target) {
                return;
            }
            if (!hasEventListeners && hasClass(target, 'pika-select')) {
                if (!target.onchange) {
                    target.setAttribute('onchange', 'return;');
                    addEvent(target, 'change', self._onChange);
                }
            }
            do {
                if (hasClass(pEl, 'pika-single') || pEl === opts.trigger) {
                    return;
                }
            }
            while ((pEl = pEl.parentNode));
            if (self._v && target !== opts.trigger && pEl !== opts.trigger) {
                self.hide();
            }
        };

        self.el = document.createElement('div');
        self.el.className = 'pika-single' + (opts.isRTL ? ' is-rtl' : '') + (opts.theme ? ' ' + opts.theme : '');

        addEvent(self.el, 'mousedown', self._onMouseDown, true);
        addEvent(self.el, 'touchend', self._onMouseDown, true);
        addEvent(self.el, 'change', self._onChange);

        if (opts.field) {
            if (opts.container) {
                opts.container.appendChild(self.el);
            } else if (opts.bound) {
                document.body.appendChild(self.el);
            } else {
                opts.field.parentNode.insertBefore(self.el, opts.field.nextSibling);
            }
            addEvent(opts.field, 'change', self._onInputChange);

            if (!opts.defaultDate) {
                if (hasMoment && opts.field.value) {
                    opts.defaultDate = moment(opts.field.value, opts.format).toDate();
                } else {
                    opts.defaultDate = new Date(Date.parse(opts.field.value));
                }
                opts.setDefaultDate = true;
            }
        }

        var defDate = opts.defaultDate;

        if (isDate(defDate)) {
            if (opts.setDefaultDate) {
                self.setDate(defDate, true);
            } else {
                self.gotoDate(defDate);
            }
        } else {
            self.gotoDate(new Date());
        }

        if (opts.bound) {
            this.hide();
            self.el.className += ' is-bound';
            addEvent(opts.trigger, 'click', self._onInputClick);
            addEvent(opts.trigger, 'focus', self._onInputFocus);
            addEvent(opts.trigger, 'blur', self._onInputBlur);
        } else {
            this.show();
        }
    };


    /**
     * public Pikaday API
     */
    Pikaday.prototype = {


        /**
         * configure functionality
         */
        config: function(options)
        {
            if (!this._o) {
                this._o = extend({}, defaults, true);
            }

            var opts = extend(this._o, options, true);

            opts.isRTL = !!opts.isRTL;

            opts.field = (opts.field && opts.field.nodeName) ? opts.field : null;

            opts.theme = (typeof opts.theme) === 'string' && opts.theme ? opts.theme : null;

            opts.bound = !!(opts.bound !== undefined ? opts.field && opts.bound : opts.field);

            opts.trigger = (opts.trigger && opts.trigger.nodeName) ? opts.trigger : opts.field;

            opts.disableWeekends = !!opts.disableWeekends;

            opts.disableDayFn = (typeof opts.disableDayFn) === 'function' ? opts.disableDayFn : null;

            var nom = parseInt(opts.numberOfMonths, 10) || 1;
            opts.numberOfMonths = nom > 4 ? 4 : nom;

            if (!isDate(opts.minDate)) {
                opts.minDate = false;
            }
            if (!isDate(opts.maxDate)) {
                opts.maxDate = false;
            }
            if ((opts.minDate && opts.maxDate) && opts.maxDate < opts.minDate) {
                opts.maxDate = opts.minDate = false;
            }
            if (opts.minDate) {
                this.setMinDate(opts.minDate);
            }
            if (opts.maxDate) {
                this.setMaxDate(opts.maxDate);
            }

            if (isArray(opts.yearRange)) {
                var fallback = new Date().getFullYear() - 10;
                opts.yearRange[0] = parseInt(opts.yearRange[0], 10) || fallback;
                opts.yearRange[1] = parseInt(opts.yearRange[1], 10) || fallback;
            } else {
                opts.yearRange = Math.abs(parseInt(opts.yearRange, 10)) || defaults.yearRange;
                if (opts.yearRange > 100) {
                    opts.yearRange = 100;
                }
            }

            return opts;
        },

        /**
         * return a formatted string of the current selection (using Moment.js if available)
         */
        toString: function(format)
        {
            return !isDate(this._d) ? '' : hasMoment ? moment(this._d).format(format || this._o.format) : this._d.toDateString();
        },

        /**
         * return a Moment.js object of the current selection (if available)
         */
        getMoment: function()
        {
            return hasMoment ? moment(this._d) : null;
        },

        /**
         * set the current selection from a Moment.js object (if available)
         */
        setMoment: function(date, preventOnSelect)
        {
            if (hasMoment && moment.isMoment(date)) {
                this.setDate(date.toDate(), preventOnSelect);
            }
        },

        /**
         * return a Date object of the current selection
         */
        getDate: function()
        {
            return isDate(this._d) ? new Date(this._d.getTime()) : null;
        },

        /**
         * set the current selection
         */
        setDate: function(date, preventOnSelect)
        {
            if (!date) {
                this._d = null;

                if (this._o.field) {
                    this._o.field.value = '';
                    fireEvent(this._o.field, 'change', { firedBy: this });
                }

                return this.draw();
            }
            if (typeof date === 'string') {
                date = new Date(Date.parse(date));
            }
            if (!isDate(date)) {
                return;
            }

            var min = this._o.minDate,
                max = this._o.maxDate;

            if (isDate(min) && date < min) {
                date = min;
            } else if (isDate(max) && date > max) {
                date = max;
            }

            this._d = new Date(date.getTime());
            setToStartOfDay(this._d);
            this.gotoDate(this._d);

            if (this._o.field) {
                this._o.field.value = this.toString();
                fireEvent(this._o.field, 'change', { firedBy: this });
            }
            if (!preventOnSelect && typeof this._o.onSelect === 'function') {
                this._o.onSelect.call(this, this.getDate());
            }
        },

        /**
         * change view to a specific date
         */
        gotoDate: function(date)
        {
            var newCalendar = true;

            if (!isDate(date)) {
                return;
            }

            if (this.calendars) {
                var firstVisibleDate = new Date(this.calendars[0].year, this.calendars[0].month, 1),
                    lastVisibleDate = new Date(this.calendars[this.calendars.length-1].year, this.calendars[this.calendars.length-1].month, 1),
                    visibleDate = date.getTime();
                // get the end of the month
                lastVisibleDate.setMonth(lastVisibleDate.getMonth()+1);
                lastVisibleDate.setDate(lastVisibleDate.getDate()-1);
                newCalendar = (visibleDate < firstVisibleDate.getTime() || lastVisibleDate.getTime() < visibleDate);
            }

            if (newCalendar) {
                this.calendars = [{
                    month: date.getMonth(),
                    year: date.getFullYear()
                }];
                if (this._o.mainCalendar === 'right') {
                    this.calendars[0].month += 1 - this._o.numberOfMonths;
                }
            }

            this.adjustCalendars();
        },

        adjustCalendars: function() {
            this.calendars[0] = adjustCalendar(this.calendars[0]);
            for (var c = 1; c < this._o.numberOfMonths; c++) {
                this.calendars[c] = adjustCalendar({
                    month: this.calendars[0].month + c,
                    year: this.calendars[0].year
                });
            }
            this.draw();
        },

        gotoToday: function()
        {
            this.gotoDate(new Date());
        },

        /**
         * change view to a specific month (zero-index, e.g. 0: January)
         */
        gotoMonth: function(month)
        {
            if (!isNaN(month)) {
                this.calendars[0].month = parseInt(month, 10);
                this.adjustCalendars();
            }
        },

        nextMonth: function()
        {
            this.calendars[0].month++;
            this.adjustCalendars();
        },

        prevMonth: function()
        {
            this.calendars[0].month--;
            this.adjustCalendars();
        },

        /**
         * change view to a specific full year (e.g. "2012")
         */
        gotoYear: function(year)
        {
            if (!isNaN(year)) {
                this.calendars[0].year = parseInt(year, 10);
                this.adjustCalendars();
            }
        },

        /**
         * change the minDate
         */
        setMinDate: function(value)
        {
            setToStartOfDay(value);
            this._o.minDate = value;
            this._o.minYear  = value.getFullYear();
            this._o.minMonth = value.getMonth();
            this.draw();
        },

        /**
         * change the maxDate
         */
        setMaxDate: function(value)
        {
            setToStartOfDay(value);
            this._o.maxDate = value;
            this._o.maxYear = value.getFullYear();
            this._o.maxMonth = value.getMonth();
            this.draw();
        },

        setStartRange: function(value)
        {
            this._o.startRange = value;
        },

        setEndRange: function(value)
        {
            this._o.endRange = value;
        },

        /**
         * refresh the HTML
         */
        draw: function(force)
        {
            if (!this._v && !force) {
                return;
            }
            var opts = this._o,
                minYear = opts.minYear,
                maxYear = opts.maxYear,
                minMonth = opts.minMonth,
                maxMonth = opts.maxMonth,
                html = '';

            if (this._y <= minYear) {
                this._y = minYear;
                if (!isNaN(minMonth) && this._m < minMonth) {
                    this._m = minMonth;
                }
            }
            if (this._y >= maxYear) {
                this._y = maxYear;
                if (!isNaN(maxMonth) && this._m > maxMonth) {
                    this._m = maxMonth;
                }
            }

            for (var c = 0; c < opts.numberOfMonths; c++) {
                html += '<div class="pika-lendar">' + renderTitle(this, c, this.calendars[c].year, this.calendars[c].month, this.calendars[0].year) + this.render(this.calendars[c].year, this.calendars[c].month) + '</div>';
            }

            this.el.innerHTML = html;

            if (opts.bound) {
                if(opts.field.type !== 'hidden') {
                    sto(function() {
                        opts.trigger.focus();
                    }, 1);
                }
            }

            if (typeof this._o.onDraw === 'function') {
                var self = this;
                sto(function() {
                    self._o.onDraw.call(self);
                }, 0);
            }
        },

        adjustPosition: function()
        {
            var field, pEl, width, height, viewportWidth, viewportHeight, scrollTop, left, top, clientRect;

            if (this._o.container) return;

            this.el.style.position = 'absolute';

            field = this._o.trigger;
            pEl = field;
            width = this.el.offsetWidth;
            height = this.el.offsetHeight;
            viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            scrollTop = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;

            if (typeof field.getBoundingClientRect === 'function') {
                clientRect = field.getBoundingClientRect();
                left = clientRect.left + window.pageXOffset;
                top = clientRect.bottom + window.pageYOffset;
            } else {
                left = pEl.offsetLeft;
                top  = pEl.offsetTop + pEl.offsetHeight;
                while((pEl = pEl.offsetParent)) {
                    left += pEl.offsetLeft;
                    top  += pEl.offsetTop;
                }
            }

            // default position is bottom & left
            if ((this._o.reposition && left + width > viewportWidth) ||
                (
                    this._o.position.indexOf('right') > -1 &&
                    left - width + field.offsetWidth > 0
                )
            ) {
                left = left - width + field.offsetWidth;
            }
            if ((this._o.reposition && top + height > viewportHeight + scrollTop) ||
                (
                    this._o.position.indexOf('top') > -1 &&
                    top - height - field.offsetHeight > 0
                )
            ) {
                top = top - height - field.offsetHeight;
            }

            this.el.style.left = left + 'px';
            this.el.style.top = top + 'px';
        },

        /**
         * render HTML for a particular month
         */
        render: function(year, month)
        {
            var opts   = this._o,
                now    = new Date(),
                days   = getDaysInMonth(year, month),
                before = new Date(year, month, 1).getDay(),
                data   = [],
                row    = [];
            setToStartOfDay(now);
            if (opts.firstDay > 0) {
                before -= opts.firstDay;
                if (before < 0) {
                    before += 7;
                }
            }
            var cells = days + before,
                after = cells;
            while(after > 7) {
                after -= 7;
            }
            cells += 7 - after;
            for (var i = 0, r = 0; i < cells; i++)
            {
                var day = new Date(year, month, 1 + (i - before)),
                    isSelected = isDate(this._d) ? compareDates(day, this._d) : false,
                    isToday = compareDates(day, now),
                    isEmpty = i < before || i >= (days + before),
                    isStartRange = opts.startRange && compareDates(opts.startRange, day),
                    isEndRange = opts.endRange && compareDates(opts.endRange, day),
                    isInRange = opts.startRange && opts.endRange && opts.startRange < day && day < opts.endRange,
                    isDisabled = (opts.minDate && day < opts.minDate) ||
                                 (opts.maxDate && day > opts.maxDate) ||
                                 (opts.disableWeekends && isWeekend(day)) ||
                                 (opts.disableDayFn && opts.disableDayFn(day)),
                    dayConfig = {
                        day: 1 + (i - before),
                        month: month,
                        year: year,
                        isSelected: isSelected,
                        isToday: isToday,
                        isDisabled: isDisabled,
                        isEmpty: isEmpty,
                        isStartRange: isStartRange,
                        isEndRange: isEndRange,
                        isInRange: isInRange
                    };

                row.push(renderDay(dayConfig));

                if (++r === 7) {
                    if (opts.showWeekNumber) {
                        row.unshift(renderWeek(i - before, month, year));
                    }
                    data.push(renderRow(row, opts.isRTL));
                    row = [];
                    r = 0;
                }
            }
            return renderTable(opts, data);
        },

        isVisible: function()
        {
            return this._v;
        },

        show: function()
        {
            if (!this._v) {
                removeClass(this.el, 'is-hidden');
                this._v = true;
                this.draw();
                if (this._o.bound) {
                    addEvent(document, 'click', this._onClick);
                    this.adjustPosition();
                }
                if (typeof this._o.onOpen === 'function') {
                    this._o.onOpen.call(this);
                }
            }
        },

        hide: function()
        {
            var v = this._v;
            if (v !== false) {
                if (this._o.bound) {
                    removeEvent(document, 'click', this._onClick);
                }
                this.el.style.position = 'static'; // reset
                this.el.style.left = 'auto';
                this.el.style.top = 'auto';
                addClass(this.el, 'is-hidden');
                this._v = false;
                if (v !== undefined && typeof this._o.onClose === 'function') {
                    this._o.onClose.call(this);
                }
            }
        },

        /**
         * GAME OVER
         */
        destroy: function()
        {
            this.hide();
            removeEvent(this.el, 'mousedown', this._onMouseDown, true);
            removeEvent(this.el, 'touchend', this._onMouseDown, true);
            removeEvent(this.el, 'change', this._onChange);
            if (this._o.field) {
                removeEvent(this._o.field, 'change', this._onInputChange);
                if (this._o.bound) {
                    removeEvent(this._o.trigger, 'click', this._onInputClick);
                    removeEvent(this._o.trigger, 'focus', this._onInputFocus);
                    removeEvent(this._o.trigger, 'blur', this._onInputBlur);
                }
            }
            if (this.el.parentNode) {
                this.el.parentNode.removeChild(this.el);
            }
        }

    };

    return Pikaday;

}));

var h,aa=aa||{},ca=this;function da(){}
function u(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function fa(a){var b=u(a);return"array"==b||"object"==b&&"number"==typeof a.length}function ga(a){return"string"==typeof a}function ha(a){return"function"==u(a)}function ia(a){return a[ka]||(a[ka]=++la)}var ka="closure_uid_"+(1E9*Math.random()>>>0),la=0;function na(a,b,c){return a.call.apply(a.bind,arguments)}
function qa(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function ra(a,b,c){ra=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?na:qa;return ra.apply(null,arguments)}var sa=Date.now||function(){return+new Date};
function ua(a,b){function c(){}c.prototype=b.prototype;a.$b=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Mb=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}};function va(a){if(Error.captureStackTrace)Error.captureStackTrace(this,va);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}ua(va,Error);va.prototype.name="CustomError";function wa(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")}var ya=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function za(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")}function Aa(a,b){return a<b?-1:a>b?1:0}
function Ba(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})}function Ca(a){var b=ga(void 0)?za(void 0):"\\s";return a.replace(new RegExp("(^"+(b?"|["+b+"]+":"")+")([a-z])","g"),function(a,b,e){return b+e.toUpperCase()})};function Da(a,b){b.unshift(a);va.call(this,wa.apply(null,b));b.shift()}ua(Da,va);Da.prototype.name="AssertionError";function Fa(a,b){throw new Da("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};var Ga=Array.prototype,Ha=Ga.indexOf?function(a,b,c){return Ga.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(ga(a))return ga(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},Ja=Ga.forEach?function(a,b,c){Ga.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=ga(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)};
function Ka(a){var b;a:{b=La;for(var c=a.length,d=ga(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:ga(a)?a.charAt(b):a[b]}function Na(a,b){var c=Ha(a,b),d;(d=0<=c)&&Ga.splice.call(a,c,1);return d}function Oa(a,b){return a>b?1:a<b?-1:0};var Pa;a:{var Qa=ca.navigator;if(Qa){var Ra=Qa.userAgent;if(Ra){Pa=Ra;break a}}Pa=""};function Sa(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function Ta(a,b){for(var c in a)if(b.call(void 0,a[c],c,a))return!0;return!1}function Ua(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function Va(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}var Wa="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function Ya(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<Wa.length;f++)c=Wa[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}}function Za(a){var b=arguments.length;if(1==b&&"array"==u(arguments[0]))return Za.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};var $a=-1!=Pa.indexOf("Opera")||-1!=Pa.indexOf("OPR"),ab=-1!=Pa.indexOf("Trident")||-1!=Pa.indexOf("MSIE"),bb=-1!=Pa.indexOf("Edge"),cb=-1!=Pa.indexOf("Gecko")&&!(-1!=Pa.toLowerCase().indexOf("webkit")&&-1==Pa.indexOf("Edge"))&&!(-1!=Pa.indexOf("Trident")||-1!=Pa.indexOf("MSIE"))&&-1==Pa.indexOf("Edge"),db=-1!=Pa.toLowerCase().indexOf("webkit")&&-1==Pa.indexOf("Edge");
function eb(){var a=Pa;if(cb)return/rv\:([^\);]+)(\)|;)/.exec(a);if(bb)return/Edge\/([\d\.]+)/.exec(a);if(ab)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(db)return/WebKit\/(\S+)/.exec(a)}function fb(){var a=ca.document;return a?a.documentMode:void 0}var gb=function(){if($a&&ca.opera){var a=ca.opera.version;return ha(a)?a():a}var a="",b=eb();b&&(a=b?b[1]:"");return ab&&(b=fb(),b>parseFloat(a))?String(b):a}(),hb={};
function jb(a){var b;if(!(b=hb[a])){b=0;for(var c=ya(String(gb)).split("."),d=ya(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var g=c[f]||"",k=d[f]||"",l=RegExp("(\\d*)(\\D*)","g"),m=RegExp("(\\d*)(\\D*)","g");do{var n=l.exec(g)||["","",""],p=m.exec(k)||["","",""];if(0==n[0].length&&0==p[0].length)break;b=Aa(0==n[1].length?0:parseInt(n[1],10),0==p[1].length?0:parseInt(p[1],10))||Aa(0==n[2].length,0==p[2].length)||Aa(n[2],p[2])}while(0==b)}b=hb[a]=0<=b}return b}
var kb=ca.document,lb=kb&&ab?fb()||("CSS1Compat"==kb.compatMode?parseInt(gb,10):5):void 0;!cb&&!ab||ab&&9<=lb||cb&&jb("1.9.1");ab&&jb("9");Za("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));function mb(a,b){null!=a&&this.append.apply(this,arguments)}h=mb.prototype;h.Ra="";h.set=function(a){this.Ra=""+a};h.append=function(a,b,c){this.Ra+=a;if(null!=b)for(var d=1;d<arguments.length;d++)this.Ra+=arguments[d];return this};h.clear=function(){this.Ra=""};h.getLength=function(){return this.Ra.length};h.toString=function(){return this.Ra};var nb={},ob;if("undefined"===typeof pb)var pb=function(){throw Error("No *print-fn* fn set for evaluation environment");};if("undefined"===typeof qb)var qb=function(){throw Error("No *print-err-fn* fn set for evaluation environment");};var rb=null;if("undefined"===typeof sb)var sb=null;function tb(){return new y(null,5,[ub,!0,vb,!0,wb,!1,xb,!1,yb,null],null)}zb;function z(a){return null!=a&&!1!==a}Bb;B;function Cb(a){return a instanceof Array}function Db(a){return null==a?!0:!1===a?!0:!1}
function C(a,b){return a[u(null==b?null:b)]?!0:a._?!0:!1}function D(a,b){var c=null==b?null:b.constructor,c=z(z(c)?c.yc:c)?c.Sb:u(b);return Error(["No protocol method ",a," defined for type ",c,": ",b].join(""))}function Eb(a){var b=a.Sb;return z(b)?b:""+F(a)}var Fb="undefined"!==typeof Symbol&&"function"===u(Symbol)?Symbol.iterator:"@@iterator";function Gb(a){for(var b=a.length,c=Array(b),d=0;;)if(d<b)c[d]=a[d],d+=1;else break;return c}Hb;Ib;
var zb=function zb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return zb.a(arguments[0]);case 2:return zb.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};zb.a=function(a){return zb.b(null,a)};zb.b=function(a,b){function c(a,b){a.push(b);return a}var d=[];return Ib.c?Ib.c(c,d,b):Ib.call(null,c,d,b)};zb.A=2;function Jb(){}
var Kb=function Kb(b){if(null!=b&&null!=b.X)return b.X(b);var c=Kb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Kb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ICounted.-count",b);};function Lb(){}var Mb=function Mb(b,c){if(null!=b&&null!=b.U)return b.U(b,c);var d=Mb[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Mb._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ICollection.-conj",b);};function Nb(){}
var G=function G(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return G.b(arguments[0],arguments[1]);case 3:return G.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
G.b=function(a,b){if(null!=a&&null!=a.O)return a.O(a,b);var c=G[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=G._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IIndexed.-nth",a);};G.c=function(a,b,c){if(null!=a&&null!=a.wa)return a.wa(a,b,c);var d=G[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=G._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IIndexed.-nth",a);};G.A=3;function Ob(){}
var Pb=function Pb(b){if(null!=b&&null!=b.aa)return b.aa(b);var c=Pb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Pb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-first",b);},Qb=function Qb(b){if(null!=b&&null!=b.sa)return b.sa(b);var c=Qb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Qb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-rest",b);};function Rb(){}function Sb(){}
var Tb=function Tb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Tb.b(arguments[0],arguments[1]);case 3:return Tb.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Tb.b=function(a,b){if(null!=a&&null!=a.K)return a.K(a,b);var c=Tb[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Tb._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ILookup.-lookup",a);};Tb.c=function(a,b,c){if(null!=a&&null!=a.G)return a.G(a,b,c);var d=Tb[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Tb._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ILookup.-lookup",a);};Tb.A=3;
var Vb=function Vb(b,c){if(null!=b&&null!=b.hc)return b.hc(b,c);var d=Vb[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Vb._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IAssociative.-contains-key?",b);},Wb=function Wb(b,c,d){if(null!=b&&null!=b.Va)return b.Va(b,c,d);var e=Wb[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Wb._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IAssociative.-assoc",b);};function Xb(){}
function Yb(){}var Zb=function Zb(b){if(null!=b&&null!=b.sb)return b.sb(b);var c=Zb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Zb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-key",b);},$b=function $b(b){if(null!=b&&null!=b.tb)return b.tb(b);var c=$b[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=$b._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-val",b);};function ac(){}
var bc=function bc(b){if(null!=b&&null!=b.Wa)return b.Wa(b);var c=bc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=bc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-peek",b);},cc=function cc(b){if(null!=b&&null!=b.Xa)return b.Xa(b);var c=cc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=cc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-pop",b);};function dc(){}
var ec=function ec(b,c,d){if(null!=b&&null!=b.Ya)return b.Ya(b,c,d);var e=ec[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=ec._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IVector.-assoc-n",b);},fc=function fc(b){if(null!=b&&null!=b.Pb)return b.Pb(b);var c=fc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=fc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IDeref.-deref",b);};function gc(){}
var hc=function hc(b){if(null!=b&&null!=b.R)return b.R(b);var c=hc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMeta.-meta",b);},jc=function jc(b,c){if(null!=b&&null!=b.T)return b.T(b,c);var d=jc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=jc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWithMeta.-with-meta",b);};function kc(){}
var lc=function lc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return lc.b(arguments[0],arguments[1]);case 3:return lc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
lc.b=function(a,b){if(null!=a&&null!=a.Z)return a.Z(a,b);var c=lc[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=lc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IReduce.-reduce",a);};lc.c=function(a,b,c){if(null!=a&&null!=a.$)return a.$(a,b,c);var d=lc[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=lc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IReduce.-reduce",a);};lc.A=3;
var mc=function mc(b,c){if(null!=b&&null!=b.v)return b.v(b,c);var d=mc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=mc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IEquiv.-equiv",b);},nc=function nc(b){if(null!=b&&null!=b.N)return b.N(b);var c=nc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=nc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IHash.-hash",b);};function oc(){}
var pc=function pc(b){if(null!=b&&null!=b.S)return b.S(b);var c=pc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=pc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeqable.-seq",b);};function qc(){}function rc(){}function sc(){}
var tc=function tc(b){if(null!=b&&null!=b.Rb)return b.Rb(b);var c=tc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=tc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IReversible.-rseq",b);},uc=function uc(b,c){if(null!=b&&null!=b.xc)return b.xc(0,c);var d=uc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=uc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWriter.-write",b);},vc=function vc(b,c,d){if(null!=b&&null!=b.L)return b.L(b,c,d);var e=
vc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=vc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IPrintWithWriter.-pr-writer",b);},wc=function wc(b,c,d){if(null!=b&&null!=b.wc)return b.wc(0,c,d);var e=wc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=wc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IWatchable.-notify-watches",b);},xc=function xc(b){if(null!=b&&null!=b.gb)return b.gb(b);var c=xc[u(null==b?null:
b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=xc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEditableCollection.-as-transient",b);},yc=function yc(b,c){if(null!=b&&null!=b.xb)return b.xb(b,c);var d=yc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=yc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ITransientCollection.-conj!",b);},zc=function zc(b){if(null!=b&&null!=b.yb)return b.yb(b);var c=zc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=zc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ITransientCollection.-persistent!",b);},Ac=function Ac(b,c,d){if(null!=b&&null!=b.wb)return b.wb(b,c,d);var e=Ac[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Ac._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientAssociative.-assoc!",b);},Cc=function Cc(b,c,d){if(null!=b&&null!=b.vc)return b.vc(0,c,d);var e=Cc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Cc._;
if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientVector.-assoc-n!",b);};function Dc(){}
var Ec=function Ec(b,c){if(null!=b&&null!=b.fb)return b.fb(b,c);var d=Ec[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Ec._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IComparable.-compare",b);},Fc=function Fc(b){if(null!=b&&null!=b.sc)return b.sc();var c=Fc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Fc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunk.-drop-first",b);},Gc=function Gc(b){if(null!=b&&null!=b.jc)return b.jc(b);var c=
Gc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Gc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-first",b);},Hc=function Hc(b){if(null!=b&&null!=b.kc)return b.kc(b);var c=Hc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-rest",b);},Ic=function Ic(b){if(null!=b&&null!=b.ic)return b.ic(b);var c=Ic[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Ic._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedNext.-chunked-next",b);},Jc=function Jc(b){if(null!=b&&null!=b.ub)return b.ub(b);var c=Jc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Jc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-name",b);},Kc=function Kc(b){if(null!=b&&null!=b.vb)return b.vb(b);var c=Kc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Kc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-namespace",
b);},Lc=function Lc(b,c){if(null!=b&&null!=b.Wc)return b.Wc(b,c);var d=Lc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Lc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IReset.-reset!",b);},Mc=function Mc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Mc.b(arguments[0],arguments[1]);case 3:return Mc.c(arguments[0],arguments[1],arguments[2]);case 4:return Mc.m(arguments[0],arguments[1],arguments[2],
arguments[3]);case 5:return Mc.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Mc.b=function(a,b){if(null!=a&&null!=a.Yc)return a.Yc(a,b);var c=Mc[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Mc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ISwap.-swap!",a);};
Mc.c=function(a,b,c){if(null!=a&&null!=a.Zc)return a.Zc(a,b,c);var d=Mc[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Mc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ISwap.-swap!",a);};Mc.m=function(a,b,c,d){if(null!=a&&null!=a.$c)return a.$c(a,b,c,d);var e=Mc[u(null==a?null:a)];if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);e=Mc._;if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);throw D("ISwap.-swap!",a);};
Mc.C=function(a,b,c,d,e){if(null!=a&&null!=a.ad)return a.ad(a,b,c,d,e);var f=Mc[u(null==a?null:a)];if(null!=f)return f.C?f.C(a,b,c,d,e):f.call(null,a,b,c,d,e);f=Mc._;if(null!=f)return f.C?f.C(a,b,c,d,e):f.call(null,a,b,c,d,e);throw D("ISwap.-swap!",a);};Mc.A=5;var Nc=function Nc(b){if(null!=b&&null!=b.Ma)return b.Ma(b);var c=Nc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Nc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IIterable.-iterator",b);};
function Oc(a){this.od=a;this.i=1073741824;this.B=0}Oc.prototype.xc=function(a,b){return this.od.append(b)};function Pc(a){var b=new mb;a.L(null,new Oc(b),tb());return""+F(b)}var Qc="undefined"!==typeof Math.imul&&0!==Math.imul(4294967295,5)?function(a,b){return Math.imul(a,b)}:function(a,b){var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};function Rc(a){a=Qc(a|0,-862048943);return Qc(a<<15|a>>>-15,461845907)}
function Sc(a,b){var c=(a|0)^(b|0);return Qc(c<<13|c>>>-13,5)+-430675100|0}function Tc(a,b){var c=(a|0)^b,c=Qc(c^c>>>16,-2048144789),c=Qc(c^c>>>13,-1028477387);return c^c>>>16}function Uc(a){var b;a:{b=1;for(var c=0;;)if(b<a.length){var d=b+2,c=Sc(c,Rc(a.charCodeAt(b-1)|a.charCodeAt(b)<<16));b=d}else{b=c;break a}}b=1===(a.length&1)?b^Rc(a.charCodeAt(a.length-1)):b;return Tc(b,Qc(2,a.length))}Vc;Wc;Xc;Yc;var Zc={},$c=0;
function ad(a){255<$c&&(Zc={},$c=0);var b=Zc[a];if("number"!==typeof b){a:if(null!=a)if(b=a.length,0<b)for(var c=0,d=0;;)if(c<b)var e=c+1,d=Qc(31,d)+a.charCodeAt(c),c=e;else{b=d;break a}else b=0;else b=0;Zc[a]=b;$c+=1}return a=b}function bd(a){null!=a&&(a.i&4194304||a.td)?a=a.N(null):"number"===typeof a?a=Math.floor(a)%2147483647:!0===a?a=1:!1===a?a=0:"string"===typeof a?(a=ad(a),0!==a&&(a=Rc(a),a=Sc(0,a),a=Tc(a,4))):a=a instanceof Date?a.valueOf():null==a?0:nc(a);return a}
function cd(a,b){return a^b+2654435769+(a<<6)+(a>>2)}function Bb(a,b){return b instanceof a}function dd(a,b){if(a.La===b.La)return 0;var c=Db(a.qa);if(z(c?b.qa:c))return-1;if(z(a.qa)){if(Db(b.qa))return 1;c=Oa(a.qa,b.qa);return 0===c?Oa(a.name,b.name):c}return Oa(a.name,b.name)}ed;function Wc(a,b,c,d,e){this.qa=a;this.name=b;this.La=c;this.eb=d;this.Ba=e;this.i=2154168321;this.B=4096}h=Wc.prototype;h.toString=function(){return this.La};h.equiv=function(a){return this.v(null,a)};
h.v=function(a,b){return b instanceof Wc?this.La===b.La:!1};h.call=function(){function a(a,b,c){return ed.c?ed.c(b,this,c):ed.call(null,b,this,c)}function b(a,b){return ed.b?ed.b(b,this):ed.call(null,b,this)}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,0,e);case 3:return a.call(this,0,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};
h.a=function(a){return ed.b?ed.b(a,this):ed.call(null,a,this)};h.b=function(a,b){return ed.c?ed.c(a,this,b):ed.call(null,a,this,b)};h.R=function(){return this.Ba};h.T=function(a,b){return new Wc(this.qa,this.name,this.La,this.eb,b)};h.N=function(){var a=this.eb;return null!=a?a:this.eb=a=cd(Uc(this.name),ad(this.qa))};h.ub=function(){return this.name};h.vb=function(){return this.qa};h.L=function(a,b){return uc(b,this.La)};
var fd=function fd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return fd.a(arguments[0]);case 2:return fd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};fd.a=function(a){if(a instanceof Wc)return a;var b=a.indexOf("/");return-1===b?fd.b(null,a):fd.b(a.substring(0,b),a.substring(b+1,a.length))};fd.b=function(a,b){var c=null!=a?[F(a),F("/"),F(b)].join(""):b;return new Wc(a,b,c,null,null)};
fd.A=2;gd;hd;id;function I(a){if(null==a)return null;if(null!=a&&(a.i&8388608||a.Xc))return a.S(null);if(Cb(a)||"string"===typeof a)return 0===a.length?null:new id(a,0);if(C(oc,a))return pc(a);throw Error([F(a),F(" is not ISeqable")].join(""));}function J(a){if(null==a)return null;if(null!=a&&(a.i&64||a.hb))return a.aa(null);a=I(a);return null==a?null:Pb(a)}function jd(a){return null!=a?null!=a&&(a.i&64||a.hb)?a.sa(null):(a=I(a))?Qb(a):kd:kd}
function K(a){return null==a?null:null!=a&&(a.i&128||a.Qb)?a.ra(null):I(jd(a))}var Xc=function Xc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Xc.a(arguments[0]);case 2:return Xc.b(arguments[0],arguments[1]);default:return Xc.o(arguments[0],arguments[1],new id(c.slice(2),0))}};Xc.a=function(){return!0};Xc.b=function(a,b){return null==a?null==b:a===b||mc(a,b)};
Xc.o=function(a,b,c){for(;;)if(Xc.b(a,b))if(K(c))a=b,b=J(c),c=K(c);else return Xc.b(b,J(c));else return!1};Xc.I=function(a){var b=J(a),c=K(a);a=J(c);c=K(c);return Xc.o(b,a,c)};Xc.A=2;function ld(a){this.D=a}ld.prototype.next=function(){if(null!=this.D){var a=J(this.D);this.D=K(this.D);return{value:a,done:!1}}return{value:null,done:!0}};function md(a){return new ld(I(a))}nd;function od(a,b,c){this.value=a;this.kb=b;this.ec=c;this.i=8388672;this.B=0}od.prototype.S=function(){return this};
od.prototype.aa=function(){return this.value};od.prototype.sa=function(){null==this.ec&&(this.ec=nd.a?nd.a(this.kb):nd.call(null,this.kb));return this.ec};function nd(a){var b=a.next();return z(b.done)?kd:new od(b.value,a,null)}function pd(a,b){var c=Rc(a),c=Sc(0,c);return Tc(c,b)}function qd(a){var b=0,c=1;for(a=I(a);;)if(null!=a)b+=1,c=Qc(31,c)+bd(J(a))|0,a=K(a);else return pd(c,b)}var rd=pd(1,0);function sd(a){var b=0,c=0;for(a=I(a);;)if(null!=a)b+=1,c=c+bd(J(a))|0,a=K(a);else return pd(c,b)}
var td=pd(0,0);vd;Vc;wd;Jb["null"]=!0;Kb["null"]=function(){return 0};Date.prototype.v=function(a,b){return b instanceof Date&&this.valueOf()===b.valueOf()};Date.prototype.qb=!0;Date.prototype.fb=function(a,b){if(b instanceof Date)return Oa(this.valueOf(),b.valueOf());throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};mc.number=function(a,b){return a===b};xd;gc["function"]=!0;hc["function"]=function(){return null};nc._=function(a){return ia(a)};L;
function yd(a){this.J=a;this.i=32768;this.B=0}yd.prototype.Pb=function(){return this.J};function zd(a){return a instanceof yd}function L(a){return fc(a)}function Ad(a,b){var c=Kb(a);if(0===c)return b.w?b.w():b.call(null);for(var d=G.b(a,0),e=1;;)if(e<c){var f=G.b(a,e),d=b.b?b.b(d,f):b.call(null,d,f);if(zd(d))return fc(d);e+=1}else return d}function Bd(a,b,c){var d=Kb(a),e=c;for(c=0;;)if(c<d){var f=G.b(a,c),e=b.b?b.b(e,f):b.call(null,e,f);if(zd(e))return fc(e);c+=1}else return e}
function Cd(a,b){var c=a.length;if(0===a.length)return b.w?b.w():b.call(null);for(var d=a[0],e=1;;)if(e<c){var f=a[e],d=b.b?b.b(d,f):b.call(null,d,f);if(zd(d))return fc(d);e+=1}else return d}function Dd(a,b,c){var d=a.length,e=c;for(c=0;;)if(c<d){var f=a[c],e=b.b?b.b(e,f):b.call(null,e,f);if(zd(e))return fc(e);c+=1}else return e}function Ed(a,b,c,d){for(var e=a.length;;)if(d<e){var f=a[d];c=b.b?b.b(c,f):b.call(null,c,f);if(zd(c))return fc(c);d+=1}else return c}Fd;M;Gd;Hd;
function Id(a){return null!=a?a.i&2||a.Nc?!0:a.i?!1:C(Jb,a):C(Jb,a)}function Jd(a){return null!=a?a.i&16||a.tc?!0:a.i?!1:C(Nb,a):C(Nb,a)}function Kd(a,b){this.f=a;this.l=b}Kd.prototype.xa=function(){return this.l<this.f.length};Kd.prototype.next=function(){var a=this.f[this.l];this.l+=1;return a};function id(a,b){this.f=a;this.l=b;this.i=166199550;this.B=8192}h=id.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};
h.O=function(a,b){var c=b+this.l;return c<this.f.length?this.f[c]:null};h.wa=function(a,b,c){a=b+this.l;return a<this.f.length?this.f[a]:c};h.Ma=function(){return new Kd(this.f,this.l)};h.ra=function(){return this.l+1<this.f.length?new id(this.f,this.l+1):null};h.X=function(){var a=this.f.length-this.l;return 0>a?0:a};h.Rb=function(){var a=Kb(this);return 0<a?new Gd(this,a-1,null):null};h.N=function(){return qd(this)};h.v=function(a,b){return wd.b?wd.b(this,b):wd.call(null,this,b)};
h.Z=function(a,b){return Ed(this.f,b,this.f[this.l],this.l+1)};h.$=function(a,b,c){return Ed(this.f,b,c,this.l)};h.aa=function(){return this.f[this.l]};h.sa=function(){return this.l+1<this.f.length?new id(this.f,this.l+1):kd};h.S=function(){return this.l<this.f.length?this:null};h.U=function(a,b){return M.b?M.b(b,this):M.call(null,b,this)};id.prototype[Fb]=function(){return md(this)};
var hd=function hd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return hd.a(arguments[0]);case 2:return hd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};hd.a=function(a){return hd.b(a,0)};hd.b=function(a,b){return b<a.length?new id(a,b):null};hd.A=2;
var gd=function gd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return gd.a(arguments[0]);case 2:return gd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};gd.a=function(a){return hd.b(a,0)};gd.b=function(a,b){return hd.b(a,b)};gd.A=2;xd;Ld;function Gd(a,b,c){this.Ob=a;this.l=b;this.u=c;this.i=32374990;this.B=8192}h=Gd.prototype;h.toString=function(){return Pc(this)};
h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return 0<this.l?new Gd(this.Ob,this.l-1,null):null};h.X=function(){return this.l+1};h.N=function(){return qd(this)};h.v=function(a,b){return wd.b?wd.b(this,b):wd.call(null,this,b)};h.Z=function(a,b){return Ld.b?Ld.b(b,this):Ld.call(null,b,this)};h.$=function(a,b,c){return Ld.c?Ld.c(b,c,this):Ld.call(null,b,c,this)};h.aa=function(){return G.b(this.Ob,this.l)};
h.sa=function(){return 0<this.l?new Gd(this.Ob,this.l-1,null):kd};h.S=function(){return this};h.T=function(a,b){return new Gd(this.Ob,this.l,b)};h.U=function(a,b){return M.b?M.b(b,this):M.call(null,b,this)};Gd.prototype[Fb]=function(){return md(this)};function Md(a){return J(K(a))}mc._=function(a,b){return a===b};
var Nd=function Nd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Nd.w();case 1:return Nd.a(arguments[0]);case 2:return Nd.b(arguments[0],arguments[1]);default:return Nd.o(arguments[0],arguments[1],new id(c.slice(2),0))}};Nd.w=function(){return Od};Nd.a=function(a){return a};Nd.b=function(a,b){return null!=a?Mb(a,b):Mb(kd,b)};Nd.o=function(a,b,c){for(;;)if(z(c))a=Nd.b(a,b),b=J(c),c=K(c);else return Nd.b(a,b)};
Nd.I=function(a){var b=J(a),c=K(a);a=J(c);c=K(c);return Nd.o(b,a,c)};Nd.A=2;function N(a){if(null!=a)if(null!=a&&(a.i&2||a.Nc))a=a.X(null);else if(Cb(a))a=a.length;else if("string"===typeof a)a=a.length;else if(null!=a&&(a.i&8388608||a.Xc))a:{a=I(a);for(var b=0;;){if(Id(a)){a=b+Kb(a);break a}a=K(a);b+=1}}else a=Kb(a);else a=0;return a}function Pd(a,b){for(var c=null;;){if(null==a)return c;if(0===b)return I(a)?J(a):c;if(Jd(a))return G.c(a,b,c);if(I(a)){var d=K(a),e=b-1;a=d;b=e}else return c}}
function Qd(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number");if(null==a)return a;if(null!=a&&(a.i&16||a.tc))return a.O(null,b);if(Cb(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.hb)){var c;a:{c=a;for(var d=b;;){if(null==c)throw Error("Index out of bounds");if(0===d){if(I(c)){c=J(c);break a}throw Error("Index out of bounds");}if(Jd(c)){c=G.b(c,d);break a}if(I(c))c=K(c),--d;else throw Error("Index out of bounds");
}}return c}if(C(Nb,a))return G.b(a,b);throw Error([F("nth not supported on this type "),F(Eb(null==a?null:a.constructor))].join(""));}
function O(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number.");if(null==a)return null;if(null!=a&&(a.i&16||a.tc))return a.wa(null,b,null);if(Cb(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.hb))return Pd(a,b);if(C(Nb,a))return G.b(a,b);throw Error([F("nth not supported on this type "),F(Eb(null==a?null:a.constructor))].join(""));}
var ed=function ed(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ed.b(arguments[0],arguments[1]);case 3:return ed.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};ed.b=function(a,b){return null==a?null:null!=a&&(a.i&256||a.uc)?a.K(null,b):Cb(a)?b<a.length?a[b|0]:null:"string"===typeof a?b<a.length?a[b|0]:null:C(Sb,a)?Tb.b(a,b):null};
ed.c=function(a,b,c){return null!=a?null!=a&&(a.i&256||a.uc)?a.G(null,b,c):Cb(a)?b<a.length?a[b]:c:"string"===typeof a?b<a.length?a[b]:c:C(Sb,a)?Tb.c(a,b,c):c:c};ed.A=3;Rd;var Sd=function Sd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Sd.c(arguments[0],arguments[1],arguments[2]);default:return Sd.o(arguments[0],arguments[1],arguments[2],new id(c.slice(3),0))}};
Sd.c=function(a,b,c){if(null!=a)a=Wb(a,b,c);else a:{a=[b];c=[c];b=a.length;var d=0,e;for(e=xc(Td);;)if(d<b){var f=d+1;e=e.wb(null,a[d],c[d]);d=f}else{a=zc(e);break a}}return a};Sd.o=function(a,b,c,d){for(;;)if(a=Sd.c(a,b,c),z(d))b=J(d),c=Md(d),d=K(K(d));else return a};Sd.I=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),d=K(d);return Sd.o(b,a,c,d)};Sd.A=3;function Ud(a,b){this.g=a;this.u=b;this.i=393217;this.B=0}h=Ud.prototype;h.R=function(){return this.u};
h.T=function(a,b){return new Ud(this.g,b)};
h.call=function(){function a(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H,R){a=this;return Hb.rb?Hb.rb(a.g,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H,R):Hb.call(null,a.g,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H,R)}function b(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H){a=this;return a.g.ma?a.g.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H)}function c(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E){a=this;return a.g.la?a.g.la(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,
E):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E)}function d(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x){a=this;return a.g.ka?a.g.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x)}function e(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A){a=this;return a.g.ja?a.g.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A)}function f(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w){a=this;return a.g.ia?a.g.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):a.g.call(null,
b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w)}function g(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){a=this;return a.g.ha?a.g.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)}function k(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){a=this;return a.g.ga?a.g.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,t):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t)}function l(a,b,c,d,e,f,g,k,l,m,n,p,q,r){a=this;return a.g.fa?a.g.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r)}function m(a,b,c,d,e,f,g,k,l,m,n,p,q){a=this;
return a.g.ea?a.g.ea(b,c,d,e,f,g,k,l,m,n,p,q):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q)}function n(a,b,c,d,e,f,g,k,l,m,n,p){a=this;return a.g.da?a.g.da(b,c,d,e,f,g,k,l,m,n,p):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p)}function p(a,b,c,d,e,f,g,k,l,m,n){a=this;return a.g.ca?a.g.ca(b,c,d,e,f,g,k,l,m,n):a.g.call(null,b,c,d,e,f,g,k,l,m,n)}function q(a,b,c,d,e,f,g,k,l,m){a=this;return a.g.oa?a.g.oa(b,c,d,e,f,g,k,l,m):a.g.call(null,b,c,d,e,f,g,k,l,m)}function r(a,b,c,d,e,f,g,k,l){a=this;return a.g.na?a.g.na(b,c,
d,e,f,g,k,l):a.g.call(null,b,c,d,e,f,g,k,l)}function t(a,b,c,d,e,f,g,k){a=this;return a.g.W?a.g.W(b,c,d,e,f,g,k):a.g.call(null,b,c,d,e,f,g,k)}function v(a,b,c,d,e,f,g){a=this;return a.g.V?a.g.V(b,c,d,e,f,g):a.g.call(null,b,c,d,e,f,g)}function w(a,b,c,d,e,f){a=this;return a.g.C?a.g.C(b,c,d,e,f):a.g.call(null,b,c,d,e,f)}function A(a,b,c,d,e){a=this;return a.g.m?a.g.m(b,c,d,e):a.g.call(null,b,c,d,e)}function E(a,b,c,d){a=this;return a.g.c?a.g.c(b,c,d):a.g.call(null,b,c,d)}function H(a,b,c){a=this;return a.g.b?
a.g.b(b,c):a.g.call(null,b,c)}function R(a,b){a=this;return a.g.a?a.g.a(b):a.g.call(null,b)}function pa(a){a=this;return a.g.w?a.g.w():a.g.call(null)}var x=null,x=function(Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa,ib,Ab,Ub,Bc,ud,of){switch(arguments.length){case 1:return pa.call(this,Ea);case 2:return R.call(this,Ea,Q);case 3:return H.call(this,Ea,Q,S);case 4:return E.call(this,Ea,Q,S,T);case 5:return A.call(this,Ea,Q,S,T,Z);case 6:return w.call(this,Ea,Q,S,T,Z,ba);case 7:return v.call(this,Ea,Q,
S,T,Z,ba,ea);case 8:return t.call(this,Ea,Q,S,T,Z,ba,ea,ja);case 9:return r.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma);case 10:return q.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa);case 11:return p.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta);case 12:return n.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa);case 13:return m.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia);case 14:return l.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma);case 15:return k.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x);case 16:return g.call(this,
Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa);case 17:return f.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa,ib);case 18:return e.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa,ib,Ab);case 19:return d.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa,ib,Ab,Ub);case 20:return c.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa,ib,Ab,Ub,Bc);case 21:return b.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,x,Xa,ib,Ab,Ub,Bc,ud);case 22:return a.call(this,Ea,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,
Ia,Ma,x,Xa,ib,Ab,Ub,Bc,ud,of)}throw Error("Invalid arity: "+arguments.length);};x.a=pa;x.b=R;x.c=H;x.m=E;x.C=A;x.V=w;x.W=v;x.na=t;x.oa=r;x.ca=q;x.da=p;x.ea=n;x.fa=m;x.ga=l;x.ha=k;x.ia=g;x.ja=f;x.ka=e;x.la=d;x.ma=c;x.lc=b;x.rb=a;return x}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.w=function(){return this.g.w?this.g.w():this.g.call(null)};h.a=function(a){return this.g.a?this.g.a(a):this.g.call(null,a)};
h.b=function(a,b){return this.g.b?this.g.b(a,b):this.g.call(null,a,b)};h.c=function(a,b,c){return this.g.c?this.g.c(a,b,c):this.g.call(null,a,b,c)};h.m=function(a,b,c,d){return this.g.m?this.g.m(a,b,c,d):this.g.call(null,a,b,c,d)};h.C=function(a,b,c,d,e){return this.g.C?this.g.C(a,b,c,d,e):this.g.call(null,a,b,c,d,e)};h.V=function(a,b,c,d,e,f){return this.g.V?this.g.V(a,b,c,d,e,f):this.g.call(null,a,b,c,d,e,f)};
h.W=function(a,b,c,d,e,f,g){return this.g.W?this.g.W(a,b,c,d,e,f,g):this.g.call(null,a,b,c,d,e,f,g)};h.na=function(a,b,c,d,e,f,g,k){return this.g.na?this.g.na(a,b,c,d,e,f,g,k):this.g.call(null,a,b,c,d,e,f,g,k)};h.oa=function(a,b,c,d,e,f,g,k,l){return this.g.oa?this.g.oa(a,b,c,d,e,f,g,k,l):this.g.call(null,a,b,c,d,e,f,g,k,l)};h.ca=function(a,b,c,d,e,f,g,k,l,m){return this.g.ca?this.g.ca(a,b,c,d,e,f,g,k,l,m):this.g.call(null,a,b,c,d,e,f,g,k,l,m)};
h.da=function(a,b,c,d,e,f,g,k,l,m,n){return this.g.da?this.g.da(a,b,c,d,e,f,g,k,l,m,n):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n)};h.ea=function(a,b,c,d,e,f,g,k,l,m,n,p){return this.g.ea?this.g.ea(a,b,c,d,e,f,g,k,l,m,n,p):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p)};h.fa=function(a,b,c,d,e,f,g,k,l,m,n,p,q){return this.g.fa?this.g.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q)};
h.ga=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r){return this.g.ga?this.g.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r)};h.ha=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){return this.g.ha?this.g.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t)};h.ia=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){return this.g.ia?this.g.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)};
h.ja=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w){return this.g.ja?this.g.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w)};h.ka=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A){return this.g.ka?this.g.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A)};
h.la=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E){return this.g.la?this.g.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E)};h.ma=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H){return this.g.ma?this.g.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H)};
h.lc=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R){return Hb.rb?Hb.rb(this.g,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R):Hb.call(null,this.g,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R)};function xd(a,b){return ha(a)?new Ud(a,b):null==a?null:jc(a,b)}function Vd(a){var b=null!=a;return(b?null!=a?a.i&131072||a.Tc||(a.i?0:C(gc,a)):C(gc,a):b)?hc(a):null}function Wd(a){return null==a?!1:null!=a?a.i&4096||a.xd?!0:a.i?!1:C(ac,a):C(ac,a)}
function Xd(a){return null!=a?a.i&16777216||a.wd?!0:a.i?!1:C(qc,a):C(qc,a)}function Yd(a){return null==a?!1:null!=a?a.i&1024||a.Rc?!0:a.i?!1:C(Xb,a):C(Xb,a)}function Zd(a){return null!=a?a.i&16384||a.yd?!0:a.i?!1:C(dc,a):C(dc,a)}$d;ae;function be(a){return null!=a?a.B&512||a.rd?!0:!1:!1}function ce(a){var b=[];Sa(a,function(a,b){return function(a,c){return b.push(c)}}(a,b));return b}function de(a,b,c,d,e){for(;0!==e;)c[d]=a[b],d+=1,--e,b+=1}var ee={};
function fe(a){return null==a?!1:null!=a?a.i&64||a.hb?!0:a.i?!1:C(Ob,a):C(Ob,a)}function ge(a){return null==a?!1:!1===a?!1:!0}function he(a,b){return ed.c(a,b,ee)===ee?!1:!0}
function Yc(a,b){if(a===b)return 0;if(null==a)return-1;if(null==b)return 1;if("number"===typeof a){if("number"===typeof b)return Oa(a,b);throw Error([F("Cannot compare "),F(a),F(" to "),F(b)].join(""));}if(null!=a?a.B&2048||a.qb||(a.B?0:C(Dc,a)):C(Dc,a))return Ec(a,b);if("string"!==typeof a&&!Cb(a)&&!0!==a&&!1!==a||(null==a?null:a.constructor)!==(null==b?null:b.constructor))throw Error([F("Cannot compare "),F(a),F(" to "),F(b)].join(""));return Oa(a,b)}
function ie(a,b){var c=N(a),d=N(b);if(c<d)c=-1;else if(c>d)c=1;else if(0===c)c=0;else a:for(d=0;;){var e=Yc(Qd(a,d),Qd(b,d));if(0===e&&d+1<c)d+=1;else{c=e;break a}}return c}je;var Ld=function Ld(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Ld.b(arguments[0],arguments[1]);case 3:return Ld.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Ld.b=function(a,b){var c=I(b);if(c){var d=J(c),c=K(c);return Ib.c?Ib.c(a,d,c):Ib.call(null,a,d,c)}return a.w?a.w():a.call(null)};Ld.c=function(a,b,c){for(c=I(c);;)if(c){var d=J(c);b=a.b?a.b(b,d):a.call(null,b,d);if(zd(b))return fc(b);c=K(c)}else return b};Ld.A=3;ke;
var Ib=function Ib(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Ib.b(arguments[0],arguments[1]);case 3:return Ib.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Ib.b=function(a,b){return null!=b&&(b.i&524288||b.Vc)?b.Z(null,a):Cb(b)?Cd(b,a):"string"===typeof b?Cd(b,a):C(kc,b)?lc.b(b,a):Ld.b(a,b)};
Ib.c=function(a,b,c){return null!=c&&(c.i&524288||c.Vc)?c.$(null,a,b):Cb(c)?Dd(c,a,b):"string"===typeof c?Dd(c,a,b):C(kc,c)?lc.c(c,a,b):Ld.c(a,b,c)};Ib.A=3;function le(a){return a}function me(a,b,c,d){a=a.a?a.a(b):a.call(null,b);c=Ib.c(a,c,d);return a.a?a.a(c):a.call(null,c)}nb.Cd;ne;function ne(a,b){return(a%b+b)%b}function oe(a){a=(a-a%2)/2;return 0<=a?Math.floor(a):Math.ceil(a)}function pe(a){a-=a>>1&1431655765;a=(a&858993459)+(a>>2&858993459);return 16843009*(a+(a>>4)&252645135)>>24}
function qe(a){var b=1;for(a=I(a);;)if(a&&0<b)--b,a=K(a);else return a}var F=function F(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return F.w();case 1:return F.a(arguments[0]);default:return F.o(arguments[0],new id(c.slice(1),0))}};F.w=function(){return""};F.a=function(a){return null==a?"":""+a};F.o=function(a,b){for(var c=new mb(""+F(a)),d=b;;)if(z(d))c=c.append(""+F(J(d))),d=K(d);else return c.toString()};
F.I=function(a){var b=J(a);a=K(a);return F.o(b,a)};F.A=1;re;se;function wd(a,b){var c;if(Xd(b))if(Id(a)&&Id(b)&&N(a)!==N(b))c=!1;else a:{c=I(a);for(var d=I(b);;){if(null==c){c=null==d;break a}if(null!=d&&Xc.b(J(c),J(d)))c=K(c),d=K(d);else{c=!1;break a}}}else c=null;return ge(c)}function Fd(a){if(I(a)){var b=bd(J(a));for(a=K(a);;){if(null==a)return b;b=cd(b,bd(J(a)));a=K(a)}}else return 0}te;ue;se;ve;we;
function Hd(a,b,c,d,e){this.u=a;this.first=b;this.ua=c;this.count=d;this.s=e;this.i=65937646;this.B=8192}h=Hd.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return 1===this.count?null:this.ua};h.X=function(){return this.count};h.Wa=function(){return this.first};h.Xa=function(){return Qb(this)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};
h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){return this.first};h.sa=function(){return 1===this.count?kd:this.ua};h.S=function(){return this};h.T=function(a,b){return new Hd(b,this.first,this.ua,this.count,this.s)};h.U=function(a,b){return new Hd(this.u,b,this,this.count+1,null)};Hd.prototype[Fb]=function(){return md(this)};function xe(a){this.u=a;this.i=65937614;this.B=8192}h=xe.prototype;h.toString=function(){return Pc(this)};
h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return null};h.X=function(){return 0};h.Wa=function(){return null};h.Xa=function(){throw Error("Can't pop empty list");};h.N=function(){return rd};h.v=function(a,b){return(null!=b?b.i&33554432||b.ud||(b.i?0:C(rc,b)):C(rc,b))||Xd(b)?null==I(b):!1};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){return null};h.sa=function(){return kd};h.S=function(){return null};
h.T=function(a,b){return new xe(b)};h.U=function(a,b){return new Hd(this.u,b,null,1,null)};var kd=new xe(null);xe.prototype[Fb]=function(){return md(this)};function ye(a){return(null!=a?a.i&134217728||a.vd||(a.i?0:C(sc,a)):C(sc,a))?tc(a):Ib.c(Nd,kd,a)}var Vc=function Vc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Vc.o(0<c.length?new id(c.slice(0),0):null)};
Vc.o=function(a){var b;if(a instanceof id&&0===a.l)b=a.f;else a:for(b=[];;)if(null!=a)b.push(a.aa(null)),a=a.ra(null);else break a;a=b.length;for(var c=kd;;)if(0<a){var d=a-1,c=c.U(null,b[a-1]);a=d}else return c};Vc.A=0;Vc.I=function(a){return Vc.o(I(a))};function ze(a,b,c,d){this.u=a;this.first=b;this.ua=c;this.s=d;this.i=65929452;this.B=8192}h=ze.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.ra=function(){return null==this.ua?null:I(this.ua)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){return this.first};h.sa=function(){return null==this.ua?kd:this.ua};h.S=function(){return this};h.T=function(a,b){return new ze(b,this.first,this.ua,this.s)};h.U=function(a,b){return new ze(null,b,this,this.s)};ze.prototype[Fb]=function(){return md(this)};
function M(a,b){var c=null==b;return(c?c:null!=b&&(b.i&64||b.hb))?new ze(null,a,b,null):new ze(null,a,I(b),null)}function Ae(a,b){if(a.Ja===b.Ja)return 0;var c=Db(a.qa);if(z(c?b.qa:c))return-1;if(z(a.qa)){if(Db(b.qa))return 1;c=Oa(a.qa,b.qa);return 0===c?Oa(a.name,b.name):c}return Oa(a.name,b.name)}function B(a,b,c,d){this.qa=a;this.name=b;this.Ja=c;this.eb=d;this.i=2153775105;this.B=4096}h=B.prototype;h.toString=function(){return[F(":"),F(this.Ja)].join("")};
h.equiv=function(a){return this.v(null,a)};h.v=function(a,b){return b instanceof B?this.Ja===b.Ja:!1};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return ed.b(c,this);case 3:return ed.c(c,this,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return ed.b(c,this)};a.c=function(a,c,d){return ed.c(c,this,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return ed.b(a,this)};
h.b=function(a,b){return ed.c(a,this,b)};h.N=function(){var a=this.eb;return null!=a?a:this.eb=a=cd(Uc(this.name),ad(this.qa))+2654435769|0};h.ub=function(){return this.name};h.vb=function(){return this.qa};h.L=function(a,b){return uc(b,[F(":"),F(this.Ja)].join(""))};
var Be=function Be(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Be.a(arguments[0]);case 2:return Be.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Be.a=function(a){if(a instanceof B)return a;if(a instanceof Wc){var b;if(null!=a&&(a.B&4096||a.Uc))b=a.vb(null);else throw Error([F("Doesn't support namespace: "),F(a)].join(""));return new B(b,se.a?se.a(a):se.call(null,a),a.La,null)}return"string"===typeof a?(b=a.split("/"),2===b.length?new B(b[0],b[1],a,null):new B(null,b[0],a,null)):null};Be.b=function(a,b){return new B(a,b,[F(z(a)?[F(a),F("/")].join(""):null),F(b)].join(""),null)};Be.A=2;
function Ce(a,b,c,d){this.u=a;this.jb=b;this.D=c;this.s=d;this.i=32374988;this.B=0}h=Ce.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};function De(a){null!=a.jb&&(a.D=a.jb.w?a.jb.w():a.jb.call(null),a.jb=null);return a.D}h.R=function(){return this.u};h.ra=function(){pc(this);return null==this.D?null:K(this.D)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ld.b(b,this)};
h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){pc(this);return null==this.D?null:J(this.D)};h.sa=function(){pc(this);return null!=this.D?jd(this.D):kd};h.S=function(){De(this);if(null==this.D)return null;for(var a=this.D;;)if(a instanceof Ce)a=De(a);else return this.D=a,I(this.D)};h.T=function(a,b){return new Ce(b,this.jb,this.D,this.s)};h.U=function(a,b){return M(b,this)};Ce.prototype[Fb]=function(){return md(this)};Ee;function Fe(a,b){this.fc=a;this.end=b;this.i=2;this.B=0}
Fe.prototype.add=function(a){this.fc[this.end]=a;return this.end+=1};Fe.prototype.Ia=function(){var a=new Ee(this.fc,0,this.end);this.fc=null;return a};Fe.prototype.X=function(){return this.end};function Ee(a,b,c){this.f=a;this.ba=b;this.end=c;this.i=524306;this.B=0}h=Ee.prototype;h.X=function(){return this.end-this.ba};h.O=function(a,b){return this.f[this.ba+b]};h.wa=function(a,b,c){return 0<=b&&b<this.end-this.ba?this.f[this.ba+b]:c};
h.sc=function(){if(this.ba===this.end)throw Error("-drop-first of empty chunk");return new Ee(this.f,this.ba+1,this.end)};h.Z=function(a,b){return Ed(this.f,b,this.f[this.ba],this.ba+1)};h.$=function(a,b,c){return Ed(this.f,b,c,this.ba)};function $d(a,b,c,d){this.Ia=a;this.Ka=b;this.u=c;this.s=d;this.i=31850732;this.B=1536}h=$d.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.ra=function(){if(1<Kb(this.Ia))return new $d(Fc(this.Ia),this.Ka,this.u,null);var a=pc(this.Ka);return null==a?null:a};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.aa=function(){return G.b(this.Ia,0)};h.sa=function(){return 1<Kb(this.Ia)?new $d(Fc(this.Ia),this.Ka,this.u,null):null==this.Ka?kd:this.Ka};h.S=function(){return this};h.jc=function(){return this.Ia};h.kc=function(){return null==this.Ka?kd:this.Ka};
h.T=function(a,b){return new $d(this.Ia,this.Ka,b,this.s)};h.U=function(a,b){return M(b,this)};h.ic=function(){return null==this.Ka?null:this.Ka};$d.prototype[Fb]=function(){return md(this)};function Ge(a,b){return 0===Kb(a)?b:new $d(a,b,null,null)}function He(a,b){a.add(b)}function ve(a){return Gc(a)}function we(a){return Hc(a)}function je(a){for(var b=[];;)if(I(a))b.push(J(a)),a=K(a);else return b}
function Ie(a,b){if(Id(a))return N(a);for(var c=a,d=b,e=0;;)if(0<d&&I(c))c=K(c),--d,e+=1;else return e}var Je=function Je(b){return null==b?null:null==K(b)?I(J(b)):M(J(b),Je(K(b)))};function Ke(a){return zc(a)}var Le=function Le(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Le.w();case 1:return Le.a(arguments[0]);case 2:return Le.b(arguments[0],arguments[1]);default:return Le.o(arguments[0],arguments[1],new id(c.slice(2),0))}};
Le.w=function(){return xc(Od)};Le.a=function(a){return a};Le.b=function(a,b){return yc(a,b)};Le.o=function(a,b,c){for(;;)if(a=yc(a,b),z(c))b=J(c),c=K(c);else return a};Le.I=function(a){var b=J(a),c=K(a);a=J(c);c=K(c);return Le.o(b,a,c)};Le.A=2;
function Me(a,b,c){var d=I(c);if(0===b)return a.w?a.w():a.call(null);c=Pb(d);var e=Qb(d);if(1===b)return a.a?a.a(c):a.a?a.a(c):a.call(null,c);var d=Pb(e),f=Qb(e);if(2===b)return a.b?a.b(c,d):a.b?a.b(c,d):a.call(null,c,d);var e=Pb(f),g=Qb(f);if(3===b)return a.c?a.c(c,d,e):a.c?a.c(c,d,e):a.call(null,c,d,e);var f=Pb(g),k=Qb(g);if(4===b)return a.m?a.m(c,d,e,f):a.m?a.m(c,d,e,f):a.call(null,c,d,e,f);var g=Pb(k),l=Qb(k);if(5===b)return a.C?a.C(c,d,e,f,g):a.C?a.C(c,d,e,f,g):a.call(null,c,d,e,f,g);var k=Pb(l),
m=Qb(l);if(6===b)return a.V?a.V(c,d,e,f,g,k):a.V?a.V(c,d,e,f,g,k):a.call(null,c,d,e,f,g,k);var l=Pb(m),n=Qb(m);if(7===b)return a.W?a.W(c,d,e,f,g,k,l):a.W?a.W(c,d,e,f,g,k,l):a.call(null,c,d,e,f,g,k,l);var m=Pb(n),p=Qb(n);if(8===b)return a.na?a.na(c,d,e,f,g,k,l,m):a.na?a.na(c,d,e,f,g,k,l,m):a.call(null,c,d,e,f,g,k,l,m);var n=Pb(p),q=Qb(p);if(9===b)return a.oa?a.oa(c,d,e,f,g,k,l,m,n):a.oa?a.oa(c,d,e,f,g,k,l,m,n):a.call(null,c,d,e,f,g,k,l,m,n);var p=Pb(q),r=Qb(q);if(10===b)return a.ca?a.ca(c,d,e,f,g,
k,l,m,n,p):a.ca?a.ca(c,d,e,f,g,k,l,m,n,p):a.call(null,c,d,e,f,g,k,l,m,n,p);var q=Pb(r),t=Qb(r);if(11===b)return a.da?a.da(c,d,e,f,g,k,l,m,n,p,q):a.da?a.da(c,d,e,f,g,k,l,m,n,p,q):a.call(null,c,d,e,f,g,k,l,m,n,p,q);var r=Pb(t),v=Qb(t);if(12===b)return a.ea?a.ea(c,d,e,f,g,k,l,m,n,p,q,r):a.ea?a.ea(c,d,e,f,g,k,l,m,n,p,q,r):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r);var t=Pb(v),w=Qb(v);if(13===b)return a.fa?a.fa(c,d,e,f,g,k,l,m,n,p,q,r,t):a.fa?a.fa(c,d,e,f,g,k,l,m,n,p,q,r,t):a.call(null,c,d,e,f,g,k,l,m,n,p,q,
r,t);var v=Pb(w),A=Qb(w);if(14===b)return a.ga?a.ga(c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.ga?a.ga(c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v);var w=Pb(A),E=Qb(A);if(15===b)return a.ha?a.ha(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):a.ha?a.ha(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w);var A=Pb(E),H=Qb(E);if(16===b)return a.ia?a.ia(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):a.ia?a.ia(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A);var E=Pb(H),
R=Qb(H);if(17===b)return a.ja?a.ja(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E):a.ja?a.ja(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E);var H=Pb(R),pa=Qb(R);if(18===b)return a.ka?a.ka(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H):a.ka?a.ka(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H);R=Pb(pa);pa=Qb(pa);if(19===b)return a.la?a.la(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R):a.la?a.la(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R):a.call(null,c,d,e,f,g,k,
l,m,n,p,q,r,t,v,w,A,E,H,R);var x=Pb(pa);Qb(pa);if(20===b)return a.ma?a.ma(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R,x):a.ma?a.ma(c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R,x):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R,x);throw Error("Only up to 20 arguments supported on functions");}
var Hb=function Hb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Hb.b(arguments[0],arguments[1]);case 3:return Hb.c(arguments[0],arguments[1],arguments[2]);case 4:return Hb.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Hb.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:return Hb.o(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],new id(c.slice(5),0))}};
Hb.b=function(a,b){var c=a.A;if(a.I){var d=Ie(b,c+1);return d<=c?Me(a,d,b):a.I(b)}return a.apply(a,je(b))};Hb.c=function(a,b,c){b=M(b,c);c=a.A;if(a.I){var d=Ie(b,c+1);return d<=c?Me(a,d,b):a.I(b)}return a.apply(a,je(b))};Hb.m=function(a,b,c,d){b=M(b,M(c,d));c=a.A;return a.I?(d=Ie(b,c+1),d<=c?Me(a,d,b):a.I(b)):a.apply(a,je(b))};Hb.C=function(a,b,c,d,e){b=M(b,M(c,M(d,e)));c=a.A;return a.I?(d=Ie(b,c+1),d<=c?Me(a,d,b):a.I(b)):a.apply(a,je(b))};
Hb.o=function(a,b,c,d,e,f){b=M(b,M(c,M(d,M(e,Je(f)))));c=a.A;return a.I?(d=Ie(b,c+1),d<=c?Me(a,d,b):a.I(b)):a.apply(a,je(b))};Hb.I=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),e=K(d),d=J(e),f=K(e),e=J(f),f=K(f);return Hb.o(b,a,c,d,e,f)};Hb.A=5;
var Ne=function Ne(){"undefined"===typeof ob&&(ob=function(b,c){this.kd=b;this.hd=c;this.i=393216;this.B=0},ob.prototype.T=function(b,c){return new ob(this.kd,c)},ob.prototype.R=function(){return this.hd},ob.prototype.xa=function(){return!1},ob.prototype.next=function(){return Error("No such element")},ob.prototype.remove=function(){return Error("Unsupported operation")},ob.Dd=function(){return new P(null,2,5,U,[xd(Oe,new y(null,1,[Pe,Vc(Qe,Vc(Od))],null)),nb.Bd],null)},ob.yc=!0,ob.Sb="cljs.core/t_cljs$core4908",
ob.bd=function(b){return uc(b,"cljs.core/t_cljs$core4908")});return new ob(Ne,Re)};Se;function Se(a,b,c,d){this.nb=a;this.first=b;this.ua=c;this.u=d;this.i=31719628;this.B=0}h=Se.prototype;h.T=function(a,b){return new Se(this.nb,this.first,this.ua,b)};h.U=function(a,b){return M(b,pc(this))};h.v=function(a,b){return null!=pc(this)?wd(this,b):Xd(b)&&null==I(b)};h.N=function(){return qd(this)};h.S=function(){null!=this.nb&&this.nb.step(this);return null==this.ua?null:this};
h.aa=function(){null!=this.nb&&pc(this);return null==this.ua?null:this.first};h.sa=function(){null!=this.nb&&pc(this);return null==this.ua?kd:this.ua};h.ra=function(){null!=this.nb&&pc(this);return null==this.ua?null:pc(this.ua)};Se.prototype[Fb]=function(){return md(this)};function Te(a,b){for(;;){if(null==I(b))return!0;var c;c=J(b);c=a.a?a.a(c):a.call(null,c);if(z(c)){c=a;var d=K(b);a=c;b=d}else return!1}}
function Ue(a){for(var b=le;;)if(I(a)){var c;c=J(a);c=b.a?b.a(c):b.call(null,c);if(z(c))return c;a=K(a)}else return null}var Ve=function Ve(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Ve.w();case 1:return Ve.a(arguments[0]);case 2:return Ve.b(arguments[0],arguments[1]);case 3:return Ve.c(arguments[0],arguments[1],arguments[2]);default:return Ve.o(arguments[0],arguments[1],arguments[2],new id(c.slice(3),0))}};Ve.w=function(){return le};
Ve.a=function(a){return a};
Ve.b=function(a,b){return function(){function c(c,d,e){c=b.c?b.c(c,d,e):b.call(null,c,d,e);return a.a?a.a(c):a.call(null,c)}function d(c,d){var e=b.b?b.b(c,d):b.call(null,c,d);return a.a?a.a(e):a.call(null,e)}function e(c){c=b.a?b.a(c):b.call(null,c);return a.a?a.a(c):a.call(null,c)}function f(){var c=b.w?b.w():b.call(null);return a.a?a.a(c):a.call(null,c)}var g=null,k=function(){function c(a,b,e,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+
3],++g;g=new id(k,0)}return d.call(this,a,b,e,g)}function d(c,e,f,g){c=Hb.C(b,c,e,f,g);return a.a?a.a(c):a.call(null,c)}c.A=3;c.I=function(a){var b=J(a);a=K(a);var c=J(a);a=K(a);var e=J(a);a=jd(a);return d(b,c,e,a)};c.o=d;return c}(),g=function(a,b,g,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,g);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+
3],++q;q=new id(r,0)}return k.o(a,b,g,q)}throw Error("Invalid arity: "+arguments.length);};g.A=3;g.I=k.I;g.w=f;g.a=e;g.b=d;g.c=c;g.o=k.o;return g}()};
Ve.c=function(a,b,c){return function(){function d(d,e,f){d=c.c?c.c(d,e,f):c.call(null,d,e,f);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function e(d,e){var f;f=c.b?c.b(d,e):c.call(null,d,e);f=b.a?b.a(f):b.call(null,f);return a.a?a.a(f):a.call(null,f)}function f(d){d=c.a?c.a(d):c.call(null,d);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function g(){var d;d=c.w?c.w():c.call(null);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}var k=null,l=function(){function d(a,
b,c,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+3],++g;g=new id(k,0)}return e.call(this,a,b,c,g)}function e(d,f,g,k){d=Hb.C(c,d,f,g,k);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}d.A=3;d.I=function(a){var b=J(a);a=K(a);var c=J(a);a=K(a);var d=J(a);a=jd(a);return e(b,c,d,a)};d.o=e;return d}(),k=function(a,b,c,k){switch(arguments.length){case 0:return g.call(this);case 1:return f.call(this,a);case 2:return e.call(this,a,
b);case 3:return d.call(this,a,b,c);default:var r=null;if(3<arguments.length){for(var r=0,t=Array(arguments.length-3);r<t.length;)t[r]=arguments[r+3],++r;r=new id(t,0)}return l.o(a,b,c,r)}throw Error("Invalid arity: "+arguments.length);};k.A=3;k.I=l.I;k.w=g;k.a=f;k.b=e;k.c=d;k.o=l.o;return k}()};
Ve.o=function(a,b,c,d){return function(a){return function(){function b(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new id(e,0)}return c.call(this,d)}function c(b){b=Hb.b(J(a),b);for(var d=K(a);;)if(d)b=J(d).call(null,b),d=K(d);else return b}b.A=0;b.I=function(a){a=I(a);return c(a)};b.o=c;return b}()}(ye(M(a,M(b,M(c,d)))))};Ve.I=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),d=K(d);return Ve.o(b,a,c,d)};Ve.A=3;We;
function Xe(a,b,c,d){this.state=a;this.u=b;this.pd=c;this.Kc=d;this.B=16386;this.i=6455296}h=Xe.prototype;h.equiv=function(a){return this.v(null,a)};h.v=function(a,b){return this===b};h.Pb=function(){return this.state};h.R=function(){return this.u};
h.wc=function(a,b,c){a=I(this.Kc);for(var d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);g.m?g.m(k,this,b,c):g.call(null,k,this,b,c);f+=1}else if(a=I(a))be(a)?(d=Gc(a),a=Hc(a),k=d,e=N(d),d=k):(d=J(a),k=O(d,0),g=O(d,1),g.m?g.m(k,this,b,c):g.call(null,k,this,b,c),a=K(a),d=null,e=0),f=0;else return null};h.N=function(){return ia(this)};
var V=function V(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return V.a(arguments[0]);default:return V.o(arguments[0],new id(c.slice(1),0))}};V.a=function(a){return new Xe(a,null,null,null)};V.o=function(a,b){var c=null!=b&&(b.i&64||b.hb)?Hb.b(vd,b):b,d=ed.b(c,wb),c=ed.b(c,Ye);return new Xe(a,d,c,null)};V.I=function(a){var b=J(a);a=K(a);return V.o(b,a)};V.A=1;Ze;
function $e(a,b){if(a instanceof Xe){var c=a.pd;if(null!=c&&!z(c.a?c.a(b):c.call(null,b)))throw Error([F("Assert failed: "),F("Validator rejected reference state"),F("\n"),F(function(){var a=Vc(af,bf);return Ze.a?Ze.a(a):Ze.call(null,a)}())].join(""));c=a.state;a.state=b;null!=a.Kc&&wc(a,c,b);return b}return Lc(a,b)}
var cf=function cf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return cf.b(arguments[0],arguments[1]);case 3:return cf.c(arguments[0],arguments[1],arguments[2]);case 4:return cf.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return cf.o(arguments[0],arguments[1],arguments[2],arguments[3],new id(c.slice(4),0))}};cf.b=function(a,b){var c;a instanceof Xe?(c=a.state,c=b.a?b.a(c):b.call(null,c),c=$e(a,c)):c=Mc.b(a,b);return c};
cf.c=function(a,b,c){if(a instanceof Xe){var d=a.state;b=b.b?b.b(d,c):b.call(null,d,c);a=$e(a,b)}else a=Mc.c(a,b,c);return a};cf.m=function(a,b,c,d){if(a instanceof Xe){var e=a.state;b=b.c?b.c(e,c,d):b.call(null,e,c,d);a=$e(a,b)}else a=Mc.m(a,b,c,d);return a};cf.o=function(a,b,c,d,e){return a instanceof Xe?$e(a,Hb.C(b,a.state,c,d,e)):Mc.C(a,b,c,d,e)};cf.I=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),e=K(d),d=J(e),e=K(e);return cf.o(b,a,c,d,e)};cf.A=4;
function df(a){this.state=a;this.i=32768;this.B=0}df.prototype.Pb=function(){return this.state};function We(a){return new df(a)}
var re=function re(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return re.a(arguments[0]);case 2:return re.b(arguments[0],arguments[1]);case 3:return re.c(arguments[0],arguments[1],arguments[2]);case 4:return re.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return re.o(arguments[0],arguments[1],arguments[2],arguments[3],new id(c.slice(4),0))}};
re.a=function(a){return function(b){return function(){function c(c,d){var e=a.a?a.a(d):a.call(null,d);return b.b?b.b(c,e):b.call(null,c,e)}function d(a){return b.a?b.a(a):b.call(null,a)}function e(){return b.w?b.w():b.call(null)}var f=null,g=function(){function c(a,b,e){var f=null;if(2<arguments.length){for(var f=0,g=Array(arguments.length-2);f<g.length;)g[f]=arguments[f+2],++f;f=new id(g,0)}return d.call(this,a,b,f)}function d(c,e,f){e=Hb.c(a,e,f);return b.b?b.b(c,e):b.call(null,c,e)}c.A=2;c.I=function(a){var b=
J(a);a=K(a);var c=J(a);a=jd(a);return d(b,c,a)};c.o=d;return c}(),f=function(a,b,f){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b);default:var n=null;if(2<arguments.length){for(var n=0,p=Array(arguments.length-2);n<p.length;)p[n]=arguments[n+2],++n;n=new id(p,0)}return g.o(a,b,n)}throw Error("Invalid arity: "+arguments.length);};f.A=2;f.I=g.I;f.w=e;f.a=d;f.b=c;f.o=g.o;return f}()}};
re.b=function(a,b){return new Ce(null,function(){var c=I(b);if(c){if(be(c)){for(var d=Gc(c),e=N(d),f=new Fe(Array(e),0),g=0;;)if(g<e)He(f,function(){var b=G.b(d,g);return a.a?a.a(b):a.call(null,b)}()),g+=1;else break;return Ge(f.Ia(),re.b(a,Hc(c)))}return M(function(){var b=J(c);return a.a?a.a(b):a.call(null,b)}(),re.b(a,jd(c)))}return null},null,null)};
re.c=function(a,b,c){return new Ce(null,function(){var d=I(b),e=I(c);if(d&&e){var f=M,g;g=J(d);var k=J(e);g=a.b?a.b(g,k):a.call(null,g,k);d=f(g,re.c(a,jd(d),jd(e)))}else d=null;return d},null,null)};re.m=function(a,b,c,d){return new Ce(null,function(){var e=I(b),f=I(c),g=I(d);if(e&&f&&g){var k=M,l;l=J(e);var m=J(f),n=J(g);l=a.c?a.c(l,m,n):a.call(null,l,m,n);e=k(l,re.m(a,jd(e),jd(f),jd(g)))}else e=null;return e},null,null)};
re.o=function(a,b,c,d,e){var f=function k(a){return new Ce(null,function(){var b=re.b(I,a);return Te(le,b)?M(re.b(J,b),k(re.b(jd,b))):null},null,null)};return re.b(function(){return function(b){return Hb.b(a,b)}}(f),f(Nd.o(e,d,gd([c,b],0))))};re.I=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),e=K(d),d=J(e),e=K(e);return re.o(b,a,c,d,e)};re.A=4;ef;
function ff(a,b){return new Ce(null,function(){var c=I(b);if(c){if(be(c)){for(var d=Gc(c),e=N(d),f=new Fe(Array(e),0),g=0;;)if(g<e){var k;k=G.b(d,g);k=a.a?a.a(k):a.call(null,k);z(k)&&(k=G.b(d,g),f.add(k));g+=1}else break;return Ge(f.Ia(),ff(a,Hc(c)))}d=J(c);c=jd(c);return z(a.a?a.a(d):a.call(null,d))?M(d,ff(a,c)):ff(a,c)}return null},null,null)}
var gf=function gf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return gf.b(arguments[0],arguments[1]);case 3:return gf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};gf.b=function(a,b){return null!=a?null!=a&&(a.B&4||a.Oc)?xd(Ke(Ib.c(yc,xc(a),b)),Vd(a)):Ib.c(Mb,a,b):Ib.c(Nd,kd,b)};
gf.c=function(a,b,c){return null!=a&&(a.B&4||a.Oc)?xd(Ke(me(b,Le,xc(a),c)),Vd(a)):me(b,Nd,a,c)};gf.A=3;function hf(a,b){return Ke(Ib.c(function(b,d){return Le.b(b,a.a?a.a(d):a.call(null,d))},xc(Od),b))}function jf(a,b){return Ke(Ib.c(function(b,d){return z(a.a?a.a(d):a.call(null,d))?Le.b(b,d):b},xc(Od),b))}
function kf(a,b){var c;a:{c=ee;for(var d=a,e=I(b);;)if(e)if(null!=d?d.i&256||d.uc||(d.i?0:C(Sb,d)):C(Sb,d)){d=ed.c(d,J(e),c);if(c===d){c=null;break a}e=K(e)}else{c=null;break a}else{c=d;break a}}return c}var lf=function lf(b,c,d){var e=O(c,0);c=qe(c);return z(c)?Sd.c(b,e,lf(ed.b(b,e),c,d)):Sd.c(b,e,d)};function mf(a,b){this.M=a;this.f=b}
function nf(a){return new mf(a,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null])}function pf(a){return new mf(a.M,Gb(a.f))}function qf(a){a=a.j;return 32>a?0:a-1>>>5<<5}function rf(a,b,c){for(;;){if(0===b)return c;var d=nf(a);d.f[0]=c;c=d;b-=5}}var sf=function sf(b,c,d,e){var f=pf(d),g=b.j-1>>>c&31;5===c?f.f[g]=e:(d=d.f[g],b=null!=d?sf(b,c-5,d,e):rf(null,c-5,e),f.f[g]=b);return f};
function tf(a,b){throw Error([F("No item "),F(a),F(" in vector of length "),F(b)].join(""));}function uf(a,b){if(b>=qf(a))return a.pa;for(var c=a.root,d=a.shift;;)if(0<d)var e=d-5,c=c.f[b>>>d&31],d=e;else return c.f}function vf(a,b){return 0<=b&&b<a.j?uf(a,b):tf(b,a.j)}
var wf=function wf(b,c,d,e,f){var g=pf(d);if(0===c)g.f[e&31]=f;else{var k=e>>>c&31;b=wf(b,c-5,d.f[k],e,f);g.f[k]=b}return g},xf=function xf(b,c,d){var e=b.j-2>>>c&31;if(5<c){b=xf(b,c-5,d.f[e]);if(null==b&&0===e)return null;d=pf(d);d.f[e]=b;return d}if(0===e)return null;d=pf(d);d.f[e]=null;return d};function yf(a,b,c,d,e,f){this.l=a;this.Mb=b;this.f=c;this.Ca=d;this.start=e;this.end=f}yf.prototype.xa=function(){return this.l<this.end};
yf.prototype.next=function(){32===this.l-this.Mb&&(this.f=uf(this.Ca,this.l),this.Mb+=32);var a=this.f[this.l&31];this.l+=1;return a};zf;Af;Bf;L;Cf;Df;Ef;function P(a,b,c,d,e,f){this.u=a;this.j=b;this.shift=c;this.root=d;this.pa=e;this.s=f;this.i=167668511;this.B=8196}h=P.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
h.O=function(a,b){return vf(this,b)[b&31]};h.wa=function(a,b,c){return 0<=b&&b<this.j?uf(this,b)[b&31]:c};h.Ya=function(a,b,c){if(0<=b&&b<this.j)return qf(this)<=b?(a=Gb(this.pa),a[b&31]=c,new P(this.u,this.j,this.shift,this.root,a,null)):new P(this.u,this.j,this.shift,wf(this,this.shift,this.root,b,c),this.pa,null);if(b===this.j)return Mb(this,c);throw Error([F("Index "),F(b),F(" out of bounds  [0,"),F(this.j),F("]")].join(""));};
h.Ma=function(){var a=this.j;return new yf(0,0,0<N(this)?uf(this,0):null,this,0,a)};h.R=function(){return this.u};h.X=function(){return this.j};h.sb=function(){return G.b(this,0)};h.tb=function(){return G.b(this,1)};h.Wa=function(){return 0<this.j?G.b(this,this.j-1):null};
h.Xa=function(){if(0===this.j)throw Error("Can't pop empty vector");if(1===this.j)return jc(Od,this.u);if(1<this.j-qf(this))return new P(this.u,this.j-1,this.shift,this.root,this.pa.slice(0,-1),null);var a=uf(this,this.j-2),b=xf(this,this.shift,this.root),b=null==b?U:b,c=this.j-1;return 5<this.shift&&null==b.f[1]?new P(this.u,c,this.shift-5,b.f[0],a,null):new P(this.u,c,this.shift,b,a,null)};h.Rb=function(){return 0<this.j?new Gd(this,this.j-1,null):null};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){if(b instanceof P)if(this.j===N(b))for(var c=Nc(this),d=Nc(b);;)if(z(c.xa())){var e=c.next(),f=d.next();if(!Xc.b(e,f))return!1}else return!0;else return!1;else return wd(this,b)};h.gb=function(){return new Bf(this.j,this.shift,zf.a?zf.a(this.root):zf.call(null,this.root),Af.a?Af.a(this.pa):Af.call(null,this.pa))};h.Z=function(a,b){return Ad(this,b)};
h.$=function(a,b,c){a=0;for(var d=c;;)if(a<this.j){var e=uf(this,a);c=e.length;a:for(var f=0;;)if(f<c){var g=e[f],d=b.b?b.b(d,g):b.call(null,d,g);if(zd(d)){e=d;break a}f+=1}else{e=d;break a}if(zd(e))return L.a?L.a(e):L.call(null,e);a+=c;d=e}else return d};h.Va=function(a,b,c){if("number"===typeof b)return ec(this,b,c);throw Error("Vector's key for assoc must be a number.");};
h.S=function(){if(0===this.j)return null;if(32>=this.j)return new id(this.pa,0);var a;a:{a=this.root;for(var b=this.shift;;)if(0<b)b-=5,a=a.f[0];else{a=a.f;break a}}return Ef.m?Ef.m(this,a,0,0):Ef.call(null,this,a,0,0)};h.T=function(a,b){return new P(b,this.j,this.shift,this.root,this.pa,this.s)};
h.U=function(a,b){if(32>this.j-qf(this)){for(var c=this.pa.length,d=Array(c+1),e=0;;)if(e<c)d[e]=this.pa[e],e+=1;else break;d[c]=b;return new P(this.u,this.j+1,this.shift,this.root,d,null)}c=(d=this.j>>>5>1<<this.shift)?this.shift+5:this.shift;d?(d=nf(null),d.f[0]=this.root,e=rf(null,this.shift,new mf(null,this.pa)),d.f[1]=e):d=sf(this,this.shift,this.root,new mf(null,this.pa));return new P(this.u,this.j+1,c,d,[b],null)};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.wa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.wa(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return this.O(null,a)};h.b=function(a,b){return this.wa(null,a,b)};
var U=new mf(null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]),Od=new P(null,0,5,U,[],rd);P.prototype[Fb]=function(){return md(this)};function ke(a){if(Cb(a))a:{var b=a.length;if(32>b)a=new P(null,b,5,U,a,null);else for(var c=32,d=(new P(null,32,5,U,a.slice(0,32),null)).gb(null);;)if(c<b)var e=c+1,d=Le.b(d,a[c]),c=e;else{a=zc(d);break a}}else a=zc(Ib.c(yc,xc(Od),a));return a}Ff;
function ae(a,b,c,d,e,f){this.Aa=a;this.node=b;this.l=c;this.ba=d;this.u=e;this.s=f;this.i=32375020;this.B=1536}h=ae.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){if(this.ba+1<this.node.length){var a;a=this.Aa;var b=this.node,c=this.l,d=this.ba+1;a=Ef.m?Ef.m(a,b,c,d):Ef.call(null,a,b,c,d);return null==a?null:a}return Ic(this)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};
h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){var c;c=this.Aa;var d=this.l+this.ba,e=N(this.Aa);c=Ff.c?Ff.c(c,d,e):Ff.call(null,c,d,e);return Ad(c,b)};h.$=function(a,b,c){a=this.Aa;var d=this.l+this.ba,e=N(this.Aa);a=Ff.c?Ff.c(a,d,e):Ff.call(null,a,d,e);return Bd(a,b,c)};h.aa=function(){return this.node[this.ba]};h.sa=function(){if(this.ba+1<this.node.length){var a;a=this.Aa;var b=this.node,c=this.l,d=this.ba+1;a=Ef.m?Ef.m(a,b,c,d):Ef.call(null,a,b,c,d);return null==a?kd:a}return Hc(this)};
h.S=function(){return this};h.jc=function(){var a=this.node;return new Ee(a,this.ba,a.length)};h.kc=function(){var a=this.l+this.node.length;if(a<Kb(this.Aa)){var b=this.Aa,c=uf(this.Aa,a);return Ef.m?Ef.m(b,c,a,0):Ef.call(null,b,c,a,0)}return kd};h.T=function(a,b){return Ef.C?Ef.C(this.Aa,this.node,this.l,this.ba,b):Ef.call(null,this.Aa,this.node,this.l,this.ba,b)};h.U=function(a,b){return M(b,this)};
h.ic=function(){var a=this.l+this.node.length;if(a<Kb(this.Aa)){var b=this.Aa,c=uf(this.Aa,a);return Ef.m?Ef.m(b,c,a,0):Ef.call(null,b,c,a,0)}return null};ae.prototype[Fb]=function(){return md(this)};
var Ef=function Ef(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Ef.c(arguments[0],arguments[1],arguments[2]);case 4:return Ef.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Ef.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Ef.c=function(a,b,c){return new ae(a,vf(a,b),b,c,null,null)};
Ef.m=function(a,b,c,d){return new ae(a,b,c,d,null,null)};Ef.C=function(a,b,c,d,e){return new ae(a,b,c,d,e,null)};Ef.A=5;Gf;function Hf(a,b,c,d,e){this.u=a;this.Ca=b;this.start=c;this.end=d;this.s=e;this.i=167666463;this.B=8192}h=Hf.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
h.O=function(a,b){return 0>b||this.end<=this.start+b?tf(b,this.end-this.start):G.b(this.Ca,this.start+b)};h.wa=function(a,b,c){return 0>b||this.end<=this.start+b?c:G.c(this.Ca,this.start+b,c)};h.Ya=function(a,b,c){var d=this.start+b;a=this.u;c=Sd.c(this.Ca,d,c);b=this.start;var e=this.end,d=d+1,d=e>d?e:d;return Gf.C?Gf.C(a,c,b,d,null):Gf.call(null,a,c,b,d,null)};h.R=function(){return this.u};h.X=function(){return this.end-this.start};h.Wa=function(){return G.b(this.Ca,this.end-1)};
h.Xa=function(){if(this.start===this.end)throw Error("Can't pop empty vector");var a=this.u,b=this.Ca,c=this.start,d=this.end-1;return Gf.C?Gf.C(a,b,c,d,null):Gf.call(null,a,b,c,d,null)};h.Rb=function(){return this.start!==this.end?new Gd(this,this.end-this.start-1,null):null};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ad(this,b)};h.$=function(a,b,c){return Bd(this,b,c)};
h.Va=function(a,b,c){if("number"===typeof b)return ec(this,b,c);throw Error("Subvec's key for assoc must be a number.");};h.S=function(){var a=this;return function(b){return function d(e){return e===a.end?null:M(G.b(a.Ca,e),new Ce(null,function(){return function(){return d(e+1)}}(b),null,null))}}(this)(a.start)};h.T=function(a,b){return Gf.C?Gf.C(b,this.Ca,this.start,this.end,this.s):Gf.call(null,b,this.Ca,this.start,this.end,this.s)};
h.U=function(a,b){var c=this.u,d=ec(this.Ca,this.end,b),e=this.start,f=this.end+1;return Gf.C?Gf.C(c,d,e,f,null):Gf.call(null,c,d,e,f,null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.wa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.wa(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};
h.a=function(a){return this.O(null,a)};h.b=function(a,b){return this.wa(null,a,b)};Hf.prototype[Fb]=function(){return md(this)};function Gf(a,b,c,d,e){for(;;)if(b instanceof Hf)c=b.start+c,d=b.start+d,b=b.Ca;else{var f=N(b);if(0>c||0>d||c>f||d>f)throw Error("Index out of bounds");return new Hf(a,b,c,d,e)}}
var Ff=function Ff(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Ff.b(arguments[0],arguments[1]);case 3:return Ff.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Ff.b=function(a,b){return Ff.c(a,b,N(a))};Ff.c=function(a,b,c){return Gf(null,a,b,c,null)};Ff.A=3;function If(a,b){return a===b.M?b:new mf(a,Gb(b.f))}function zf(a){return new mf({},Gb(a.f))}
function Af(a){var b=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];de(a,0,b,0,a.length);return b}var Jf=function Jf(b,c,d,e){d=If(b.root.M,d);var f=b.j-1>>>c&31;if(5===c)b=e;else{var g=d.f[f];b=null!=g?Jf(b,c-5,g,e):rf(b.root.M,c-5,e)}d.f[f]=b;return d};function Bf(a,b,c,d){this.j=a;this.shift=b;this.root=c;this.pa=d;this.B=88;this.i=275}h=Bf.prototype;
h.xb=function(a,b){if(this.root.M){if(32>this.j-qf(this))this.pa[this.j&31]=b;else{var c=new mf(this.root.M,this.pa),d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];d[0]=b;this.pa=d;if(this.j>>>5>1<<this.shift){var d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],e=this.shift+
5;d[0]=this.root;d[1]=rf(this.root.M,this.shift,c);this.root=new mf(this.root.M,d);this.shift=e}else this.root=Jf(this,this.shift,this.root,c)}this.j+=1;return this}throw Error("conj! after persistent!");};h.yb=function(){if(this.root.M){this.root.M=null;var a=this.j-qf(this),b=Array(a);de(this.pa,0,b,0,a);return new P(null,this.j,this.shift,this.root,b,null)}throw Error("persistent! called twice");};
h.wb=function(a,b,c){if("number"===typeof b)return Cc(this,b,c);throw Error("TransientVector's key for assoc! must be a number.");};
h.vc=function(a,b,c){var d=this;if(d.root.M){if(0<=b&&b<d.j)return qf(this)<=b?d.pa[b&31]=c:(a=function(){return function f(a,k){var l=If(d.root.M,k);if(0===a)l.f[b&31]=c;else{var m=b>>>a&31,n=f(a-5,l.f[m]);l.f[m]=n}return l}}(this).call(null,d.shift,d.root),d.root=a),this;if(b===d.j)return yc(this,c);throw Error([F("Index "),F(b),F(" out of bounds for TransientVector of length"),F(d.j)].join(""));}throw Error("assoc! after persistent!");};
h.X=function(){if(this.root.M)return this.j;throw Error("count after persistent!");};h.O=function(a,b){if(this.root.M)return vf(this,b)[b&31];throw Error("nth after persistent!");};h.wa=function(a,b,c){return 0<=b&&b<this.j?G.b(this,b):c};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.G(null,a,b)};function Kf(){this.i=2097152;this.B=0}
Kf.prototype.equiv=function(a){return this.v(null,a)};Kf.prototype.v=function(){return!1};var Lf=new Kf;function Mf(a,b){return ge(Yd(b)?N(a)===N(b)?Te(le,re.b(function(a){return Xc.b(ed.c(b,J(a),Lf),Md(a))},a)):null:null)}function Nf(a){this.D=a}Nf.prototype.next=function(){if(null!=this.D){var a=J(this.D),b=O(a,0),a=O(a,1);this.D=K(this.D);return{value:[b,a],done:!1}}return{value:null,done:!0}};function Of(a){return new Nf(I(a))}function Pf(a){this.D=a}
Pf.prototype.next=function(){if(null!=this.D){var a=J(this.D);this.D=K(this.D);return{value:[a,a],done:!1}}return{value:null,done:!0}};
function Qf(a,b){var c;if(b instanceof B)a:{c=a.length;for(var d=b.Ja,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof B&&d===a[e].Ja){c=e;break a}e+=2}}else if(ga(b)||"number"===typeof b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(b===a[d]){c=d;break a}d+=2}else if(b instanceof Wc)a:for(c=a.length,d=b.La,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof Wc&&d===a[e].La){c=e;break a}e+=2}else if(null==b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(null==a[d]){c=d;break a}d+=2}else a:for(c=a.length,
d=0;;){if(c<=d){c=-1;break a}if(Xc.b(b,a[d])){c=d;break a}d+=2}return c}Rf;function Sf(a,b,c){this.f=a;this.l=b;this.Ba=c;this.i=32374990;this.B=0}h=Sf.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){return this.l<this.f.length-2?new Sf(this.f,this.l+2,this.Ba):null};h.X=function(){return(this.f.length-this.l)/2};h.N=function(){return qd(this)};h.v=function(a,b){return wd(this,b)};
h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){return new P(null,2,5,U,[this.f[this.l],this.f[this.l+1]],null)};h.sa=function(){return this.l<this.f.length-2?new Sf(this.f,this.l+2,this.Ba):kd};h.S=function(){return this};h.T=function(a,b){return new Sf(this.f,this.l,b)};h.U=function(a,b){return M(b,this)};Sf.prototype[Fb]=function(){return md(this)};Tf;Uf;function Vf(a,b,c){this.f=a;this.l=b;this.j=c}Vf.prototype.xa=function(){return this.l<this.j};
Vf.prototype.next=function(){var a=new P(null,2,5,U,[this.f[this.l],this.f[this.l+1]],null);this.l+=2;return a};function y(a,b,c,d){this.u=a;this.j=b;this.f=c;this.s=d;this.i=16647951;this.B=8196}h=y.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.keys=function(){return md(Tf.a?Tf.a(this):Tf.call(null,this))};h.entries=function(){return Of(I(this))};h.values=function(){return md(Uf.a?Uf.a(this):Uf.call(null,this))};h.has=function(a){return he(this,a)};
h.get=function(a,b){return this.G(null,a,b)};h.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=O(f,0),f=O(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=I(b))be(b)?(c=Gc(b),b=Hc(b),g=c,d=N(c),c=g):(c=J(b),g=O(c,0),f=O(c,1),a.b?a.b(f,g):a.call(null,f,g),b=K(b),c=null,d=0),e=0;else return null};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){a=Qf(this.f,b);return-1===a?c:this.f[a+1]};h.Ma=function(){return new Vf(this.f,0,2*this.j)};h.R=function(){return this.u};
h.X=function(){return this.j};h.N=function(){var a=this.s;return null!=a?a:this.s=a=sd(this)};h.v=function(a,b){if(null!=b&&(b.i&1024||b.Rc)){var c=this.f.length;if(this.j===b.X(null))for(var d=0;;)if(d<c){var e=b.G(null,this.f[d],ee);if(e!==ee)if(Xc.b(this.f[d+1],e))d+=2;else return!1;else return!1}else return!0;else return!1}else return Mf(this,b)};h.gb=function(){return new Rf({},this.f.length,Gb(this.f))};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};
h.Va=function(a,b,c){a=Qf(this.f,b);if(-1===a){if(this.j<Wf){a=this.f;for(var d=a.length,e=Array(d+2),f=0;;)if(f<d)e[f]=a[f],f+=1;else break;e[d]=b;e[d+1]=c;return new y(this.u,this.j+1,e,null)}return jc(Wb(gf.b(Td,this),b,c),this.u)}if(c===this.f[a+1])return this;b=Gb(this.f);b[a+1]=c;return new y(this.u,this.j,b,null)};h.hc=function(a,b){return-1!==Qf(this.f,b)};h.S=function(){var a=this.f;return 0<=a.length-2?new Sf(a,0,null):null};h.T=function(a,b){return new y(b,this.j,this.f,this.s)};
h.U=function(a,b){if(Zd(b))return Wb(this,G.b(b,0),G.b(b,1));for(var c=this,d=I(b);;){if(null==d)return c;var e=J(d);if(Zd(e))c=Wb(c,G.b(e,0),G.b(e,1)),d=K(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.G(null,a,b)};var Re=new y(null,0,[],td),Wf=8;y.prototype[Fb]=function(){return md(this)};
Xf;function Rf(a,b,c){this.ib=a;this.bb=b;this.f=c;this.i=258;this.B=56}h=Rf.prototype;h.X=function(){if(z(this.ib))return oe(this.bb);throw Error("count after persistent!");};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){if(z(this.ib))return a=Qf(this.f,b),-1===a?c:this.f[a+1];throw Error("lookup after persistent!");};
h.xb=function(a,b){if(z(this.ib)){if(null!=b?b.i&2048||b.Sc||(b.i?0:C(Yb,b)):C(Yb,b))return Ac(this,te.a?te.a(b):te.call(null,b),ue.a?ue.a(b):ue.call(null,b));for(var c=I(b),d=this;;){var e=J(c);if(z(e))c=K(c),d=Ac(d,te.a?te.a(e):te.call(null,e),ue.a?ue.a(e):ue.call(null,e));else return d}}else throw Error("conj! after persistent!");};h.yb=function(){if(z(this.ib))return this.ib=!1,new y(null,oe(this.bb),this.f,null);throw Error("persistent! called twice");};
h.wb=function(a,b,c){if(z(this.ib)){a=Qf(this.f,b);if(-1===a){if(this.bb+2<=2*Wf)return this.bb+=2,this.f.push(b),this.f.push(c),this;a=Xf.b?Xf.b(this.bb,this.f):Xf.call(null,this.bb,this.f);return Ac(a,b,c)}c!==this.f[a+1]&&(this.f[a+1]=c);return this}throw Error("assoc! after persistent!");};Yf;Rd;function Xf(a,b){for(var c=xc(Td),d=0;;)if(d<a)c=Ac(c,b[d],b[d+1]),d+=2;else return c}function Zf(){this.J=!1}$f;ag;$e;bg;V;L;
function cg(a,b){return a===b?!0:a===b||a instanceof B&&b instanceof B&&a.Ja===b.Ja?!0:Xc.b(a,b)}function dg(a,b,c){a=Gb(a);a[b]=c;return a}function eg(a,b,c,d){a=a.Za(b);a.f[c]=d;return a}fg;function gg(a,b,c,d){this.f=a;this.l=b;this.Jb=c;this.Ha=d}gg.prototype.advance=function(){for(var a=this.f.length;;)if(this.l<a){var b=this.f[this.l],c=this.f[this.l+1];null!=b?b=this.Jb=new P(null,2,5,U,[b,c],null):null!=c?(b=Nc(c),b=b.xa()?this.Ha=b:!1):b=!1;this.l+=2;if(b)return!0}else return!1};
gg.prototype.xa=function(){var a=null!=this.Jb;return a?a:(a=null!=this.Ha)?a:this.advance()};gg.prototype.next=function(){if(null!=this.Jb){var a=this.Jb;this.Jb=null;return a}if(null!=this.Ha)return a=this.Ha.next(),this.Ha.xa()||(this.Ha=null),a;if(this.advance())return this.next();throw Error("No such element");};gg.prototype.remove=function(){return Error("Unsupported operation")};function hg(a,b,c){this.M=a;this.Y=b;this.f=c}h=hg.prototype;
h.Za=function(a){if(a===this.M)return this;var b=pe(this.Y),c=Array(0>b?4:2*(b+1));de(this.f,0,c,0,2*b);return new hg(a,this.Y,c)};h.Fb=function(){return $f.a?$f.a(this.f):$f.call(null,this.f)};h.Ta=function(a,b,c,d){var e=1<<(b>>>a&31);if(0===(this.Y&e))return d;var f=pe(this.Y&e-1),e=this.f[2*f],f=this.f[2*f+1];return null==e?f.Ta(a+5,b,c,d):cg(c,e)?f:d};
h.Fa=function(a,b,c,d,e,f){var g=1<<(c>>>b&31),k=pe(this.Y&g-1);if(0===(this.Y&g)){var l=pe(this.Y);if(2*l<this.f.length){a=this.Za(a);b=a.f;f.J=!0;a:for(c=2*(l-k),f=2*k+(c-1),l=2*(k+1)+(c-1);;){if(0===c)break a;b[l]=b[f];--l;--c;--f}b[2*k]=d;b[2*k+1]=e;a.Y|=g;return a}if(16<=l){k=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];k[c>>>b&31]=ig.Fa(a,b+5,c,d,e,f);for(e=d=0;;)if(32>d)0!==
(this.Y>>>d&1)&&(k[d]=null!=this.f[e]?ig.Fa(a,b+5,bd(this.f[e]),this.f[e],this.f[e+1],f):this.f[e+1],e+=2),d+=1;else break;return new fg(a,l+1,k)}b=Array(2*(l+4));de(this.f,0,b,0,2*k);b[2*k]=d;b[2*k+1]=e;de(this.f,2*k,b,2*(k+1),2*(l-k));f.J=!0;a=this.Za(a);a.f=b;a.Y|=g;return a}l=this.f[2*k];g=this.f[2*k+1];if(null==l)return l=g.Fa(a,b+5,c,d,e,f),l===g?this:eg(this,a,2*k+1,l);if(cg(d,l))return e===g?this:eg(this,a,2*k+1,e);f.J=!0;f=b+5;d=bg.W?bg.W(a,f,l,g,c,d,e):bg.call(null,a,f,l,g,c,d,e);e=2*k;
k=2*k+1;a=this.Za(a);a.f[e]=null;a.f[k]=d;return a};
h.Ea=function(a,b,c,d,e){var f=1<<(b>>>a&31),g=pe(this.Y&f-1);if(0===(this.Y&f)){var k=pe(this.Y);if(16<=k){g=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];g[b>>>a&31]=ig.Ea(a+5,b,c,d,e);for(d=c=0;;)if(32>c)0!==(this.Y>>>c&1)&&(g[c]=null!=this.f[d]?ig.Ea(a+5,bd(this.f[d]),this.f[d],this.f[d+1],e):this.f[d+1],d+=2),c+=1;else break;return new fg(null,k+1,g)}a=Array(2*(k+1));de(this.f,
0,a,0,2*g);a[2*g]=c;a[2*g+1]=d;de(this.f,2*g,a,2*(g+1),2*(k-g));e.J=!0;return new hg(null,this.Y|f,a)}var l=this.f[2*g],f=this.f[2*g+1];if(null==l)return k=f.Ea(a+5,b,c,d,e),k===f?this:new hg(null,this.Y,dg(this.f,2*g+1,k));if(cg(c,l))return d===f?this:new hg(null,this.Y,dg(this.f,2*g+1,d));e.J=!0;e=this.Y;k=this.f;a+=5;a=bg.V?bg.V(a,l,f,b,c,d):bg.call(null,a,l,f,b,c,d);c=2*g;g=2*g+1;d=Gb(k);d[c]=null;d[g]=a;return new hg(null,e,d)};h.Ma=function(){return new gg(this.f,0,null,null)};
var ig=new hg(null,0,[]);function jg(a,b,c){this.f=a;this.l=b;this.Ha=c}jg.prototype.xa=function(){for(var a=this.f.length;;){if(null!=this.Ha&&this.Ha.xa())return!0;if(this.l<a){var b=this.f[this.l];this.l+=1;null!=b&&(this.Ha=Nc(b))}else return!1}};jg.prototype.next=function(){if(this.xa())return this.Ha.next();throw Error("No such element");};jg.prototype.remove=function(){return Error("Unsupported operation")};function fg(a,b,c){this.M=a;this.j=b;this.f=c}h=fg.prototype;
h.Za=function(a){return a===this.M?this:new fg(a,this.j,Gb(this.f))};h.Fb=function(){return ag.a?ag.a(this.f):ag.call(null,this.f)};h.Ta=function(a,b,c,d){var e=this.f[b>>>a&31];return null!=e?e.Ta(a+5,b,c,d):d};h.Fa=function(a,b,c,d,e,f){var g=c>>>b&31,k=this.f[g];if(null==k)return a=eg(this,a,g,ig.Fa(a,b+5,c,d,e,f)),a.j+=1,a;b=k.Fa(a,b+5,c,d,e,f);return b===k?this:eg(this,a,g,b)};
h.Ea=function(a,b,c,d,e){var f=b>>>a&31,g=this.f[f];if(null==g)return new fg(null,this.j+1,dg(this.f,f,ig.Ea(a+5,b,c,d,e)));a=g.Ea(a+5,b,c,d,e);return a===g?this:new fg(null,this.j,dg(this.f,f,a))};h.Ma=function(){return new jg(this.f,0,null)};function kg(a,b,c){b*=2;for(var d=0;;)if(d<b){if(cg(c,a[d]))return d;d+=2}else return-1}function lg(a,b,c,d){this.M=a;this.Sa=b;this.j=c;this.f=d}h=lg.prototype;
h.Za=function(a){if(a===this.M)return this;var b=Array(2*(this.j+1));de(this.f,0,b,0,2*this.j);return new lg(a,this.Sa,this.j,b)};h.Fb=function(){return $f.a?$f.a(this.f):$f.call(null,this.f)};h.Ta=function(a,b,c,d){a=kg(this.f,this.j,c);return 0>a?d:cg(c,this.f[a])?this.f[a+1]:d};
h.Fa=function(a,b,c,d,e,f){if(c===this.Sa){b=kg(this.f,this.j,d);if(-1===b){if(this.f.length>2*this.j)return b=2*this.j,c=2*this.j+1,a=this.Za(a),a.f[b]=d,a.f[c]=e,f.J=!0,a.j+=1,a;c=this.f.length;b=Array(c+2);de(this.f,0,b,0,c);b[c]=d;b[c+1]=e;f.J=!0;d=this.j+1;a===this.M?(this.f=b,this.j=d,a=this):a=new lg(this.M,this.Sa,d,b);return a}return this.f[b+1]===e?this:eg(this,a,b+1,e)}return(new hg(a,1<<(this.Sa>>>b&31),[null,this,null,null])).Fa(a,b,c,d,e,f)};
h.Ea=function(a,b,c,d,e){return b===this.Sa?(a=kg(this.f,this.j,c),-1===a?(a=2*this.j,b=Array(a+2),de(this.f,0,b,0,a),b[a]=c,b[a+1]=d,e.J=!0,new lg(null,this.Sa,this.j+1,b)):Xc.b(this.f[a],d)?this:new lg(null,this.Sa,this.j,dg(this.f,a+1,d))):(new hg(null,1<<(this.Sa>>>a&31),[null,this])).Ea(a,b,c,d,e)};h.Ma=function(){return new gg(this.f,0,null,null)};
var bg=function bg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 6:return bg.V(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);case 7:return bg.W(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5],arguments[6]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
bg.V=function(a,b,c,d,e,f){var g=bd(b);if(g===d)return new lg(null,g,2,[b,c,e,f]);var k=new Zf;return ig.Ea(a,g,b,c,k).Ea(a,d,e,f,k)};bg.W=function(a,b,c,d,e,f,g){var k=bd(c);if(k===e)return new lg(null,k,2,[c,d,f,g]);var l=new Zf;return ig.Fa(a,b,k,c,d,l).Fa(a,b,e,f,g,l)};bg.A=7;function mg(a,b,c,d,e){this.u=a;this.Ua=b;this.l=c;this.D=d;this.s=e;this.i=32374860;this.B=0}h=mg.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){return null==this.D?new P(null,2,5,U,[this.Ua[this.l],this.Ua[this.l+1]],null):J(this.D)};h.sa=function(){if(null==this.D){var a=this.Ua,b=this.l+2;return $f.c?$f.c(a,b,null):$f.call(null,a,b,null)}var a=this.Ua,b=this.l,c=K(this.D);return $f.c?$f.c(a,b,c):$f.call(null,a,b,c)};h.S=function(){return this};
h.T=function(a,b){return new mg(b,this.Ua,this.l,this.D,this.s)};h.U=function(a,b){return M(b,this)};mg.prototype[Fb]=function(){return md(this)};var $f=function $f(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return $f.a(arguments[0]);case 3:return $f.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};$f.a=function(a){return $f.c(a,0,null)};
$f.c=function(a,b,c){if(null==c)for(c=a.length;;)if(b<c){if(null!=a[b])return new mg(null,a,b,null,null);var d=a[b+1];if(z(d)&&(d=d.Fb(),z(d)))return new mg(null,a,b+2,d,null);b+=2}else return null;else return new mg(null,a,b,c,null)};$f.A=3;function ng(a,b,c,d,e){this.u=a;this.Ua=b;this.l=c;this.D=d;this.s=e;this.i=32374860;this.B=0}h=ng.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};h.aa=function(){return J(this.D)};h.sa=function(){var a=this.Ua,b=this.l,c=K(this.D);return ag.m?ag.m(null,a,b,c):ag.call(null,null,a,b,c)};h.S=function(){return this};h.T=function(a,b){return new ng(b,this.Ua,this.l,this.D,this.s)};h.U=function(a,b){return M(b,this)};ng.prototype[Fb]=function(){return md(this)};
var ag=function ag(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return ag.a(arguments[0]);case 4:return ag.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};ag.a=function(a){return ag.m(null,a,0,null)};
ag.m=function(a,b,c,d){if(null==d)for(d=b.length;;)if(c<d){var e=b[c];if(z(e)&&(e=e.Fb(),z(e)))return new ng(a,b,c+1,e,null);c+=1}else return null;else return new ng(a,b,c,d,null)};ag.A=4;Yf;function og(a,b,c){this.za=a;this.Hc=b;this.qc=c}og.prototype.xa=function(){return this.qc&&this.Hc.xa()};og.prototype.next=function(){if(this.qc)return this.Hc.next();this.qc=!0;return this.za};og.prototype.remove=function(){return Error("Unsupported operation")};
function Rd(a,b,c,d,e,f){this.u=a;this.j=b;this.root=c;this.ya=d;this.za=e;this.s=f;this.i=16123663;this.B=8196}h=Rd.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.keys=function(){return md(Tf.a?Tf.a(this):Tf.call(null,this))};h.entries=function(){return Of(I(this))};h.values=function(){return md(Uf.a?Uf.a(this):Uf.call(null,this))};h.has=function(a){return he(this,a)};h.get=function(a,b){return this.G(null,a,b)};
h.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=O(f,0),f=O(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=I(b))be(b)?(c=Gc(b),b=Hc(b),g=c,d=N(c),c=g):(c=J(b),g=O(c,0),f=O(c,1),a.b?a.b(f,g):a.call(null,f,g),b=K(b),c=null,d=0),e=0;else return null};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){return null==b?this.ya?this.za:c:null==this.root?c:this.root.Ta(0,bd(b),b,c)};
h.Ma=function(){var a=this.root?Nc(this.root):Ne;return this.ya?new og(this.za,a,!1):a};h.R=function(){return this.u};h.X=function(){return this.j};h.N=function(){var a=this.s;return null!=a?a:this.s=a=sd(this)};h.v=function(a,b){return Mf(this,b)};h.gb=function(){return new Yf({},this.root,this.j,this.ya,this.za)};
h.Va=function(a,b,c){if(null==b)return this.ya&&c===this.za?this:new Rd(this.u,this.ya?this.j:this.j+1,this.root,!0,c,null);a=new Zf;b=(null==this.root?ig:this.root).Ea(0,bd(b),b,c,a);return b===this.root?this:new Rd(this.u,a.J?this.j+1:this.j,b,this.ya,this.za,null)};h.hc=function(a,b){return null==b?this.ya:null==this.root?!1:this.root.Ta(0,bd(b),b,ee)!==ee};h.S=function(){if(0<this.j){var a=null!=this.root?this.root.Fb():null;return this.ya?M(new P(null,2,5,U,[null,this.za],null),a):a}return null};
h.T=function(a,b){return new Rd(b,this.j,this.root,this.ya,this.za,this.s)};h.U=function(a,b){if(Zd(b))return Wb(this,G.b(b,0),G.b(b,1));for(var c=this,d=I(b);;){if(null==d)return c;var e=J(d);if(Zd(e))c=Wb(c,G.b(e,0),G.b(e,1)),d=K(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.G(null,a,b)};var Td=new Rd(null,0,null,!1,null,td);Rd.prototype[Fb]=function(){return md(this)};
function Yf(a,b,c,d,e){this.M=a;this.root=b;this.count=c;this.ya=d;this.za=e;this.i=258;this.B=56}function pg(a,b,c){if(a.M){if(null==b)a.za!==c&&(a.za=c),a.ya||(a.count+=1,a.ya=!0);else{var d=new Zf;b=(null==a.root?ig:a.root).Fa(a.M,0,bd(b),b,c,d);b!==a.root&&(a.root=b);d.J&&(a.count+=1)}return a}throw Error("assoc! after persistent!");}h=Yf.prototype;h.X=function(){if(this.M)return this.count;throw Error("count after persistent!");};
h.K=function(a,b){return null==b?this.ya?this.za:null:null==this.root?null:this.root.Ta(0,bd(b),b)};h.G=function(a,b,c){return null==b?this.ya?this.za:c:null==this.root?c:this.root.Ta(0,bd(b),b,c)};
h.xb=function(a,b){var c;a:if(this.M)if(null!=b?b.i&2048||b.Sc||(b.i?0:C(Yb,b)):C(Yb,b))c=pg(this,te.a?te.a(b):te.call(null,b),ue.a?ue.a(b):ue.call(null,b));else{c=I(b);for(var d=this;;){var e=J(c);if(z(e))c=K(c),d=pg(d,te.a?te.a(e):te.call(null,e),ue.a?ue.a(e):ue.call(null,e));else{c=d;break a}}}else throw Error("conj! after persistent");return c};h.yb=function(){var a;if(this.M)this.M=null,a=new Rd(null,this.count,this.root,this.ya,this.za,null);else throw Error("persistent! called twice");return a};
h.wb=function(a,b,c){return pg(this,b,c)};qg;rg;function rg(a,b,c,d,e){this.key=a;this.J=b;this.left=c;this.right=d;this.s=e;this.i=32402207;this.B=0}h=rg.prototype;h.replace=function(a,b,c,d){return new rg(a,b,c,d,null)};h.K=function(a,b){return G.c(this,b,null)};h.G=function(a,b,c){return G.c(this,b,c)};h.O=function(a,b){return 0===b?this.key:1===b?this.J:null};h.wa=function(a,b,c){return 0===b?this.key:1===b?this.J:c};
h.Ya=function(a,b,c){return(new P(null,2,5,U,[this.key,this.J],null)).Ya(null,b,c)};h.R=function(){return null};h.X=function(){return 2};h.sb=function(){return this.key};h.tb=function(){return this.J};h.Wa=function(){return this.J};h.Xa=function(){return new P(null,1,5,U,[this.key],null)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ad(this,b)};h.$=function(a,b,c){return Bd(this,b,c)};
h.Va=function(a,b,c){return Sd.c(new P(null,2,5,U,[this.key,this.J],null),b,c)};h.S=function(){return Mb(Mb(kd,this.J),this.key)};h.T=function(a,b){return xd(new P(null,2,5,U,[this.key,this.J],null),b)};h.U=function(a,b){return new P(null,3,5,U,[this.key,this.J,b],null)};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.G(null,a,b)};rg.prototype[Fb]=function(){return md(this)};
function qg(a,b,c,d,e){this.key=a;this.J=b;this.left=c;this.right=d;this.s=e;this.i=32402207;this.B=0}h=qg.prototype;h.replace=function(a,b,c,d){return new qg(a,b,c,d,null)};h.K=function(a,b){return G.c(this,b,null)};h.G=function(a,b,c){return G.c(this,b,c)};h.O=function(a,b){return 0===b?this.key:1===b?this.J:null};h.wa=function(a,b,c){return 0===b?this.key:1===b?this.J:c};h.Ya=function(a,b,c){return(new P(null,2,5,U,[this.key,this.J],null)).Ya(null,b,c)};h.R=function(){return null};h.X=function(){return 2};
h.sb=function(){return this.key};h.tb=function(){return this.J};h.Wa=function(){return this.J};h.Xa=function(){return new P(null,1,5,U,[this.key],null)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ad(this,b)};h.$=function(a,b,c){return Bd(this,b,c)};h.Va=function(a,b,c){return Sd.c(new P(null,2,5,U,[this.key,this.J],null),b,c)};h.S=function(){return Mb(Mb(kd,this.J),this.key)};
h.T=function(a,b){return xd(new P(null,2,5,U,[this.key,this.J],null),b)};h.U=function(a,b){return new P(null,3,5,U,[this.key,this.J,b],null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};
h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.G(null,a,b)};qg.prototype[Fb]=function(){return md(this)};te;var vd=function vd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return vd.o(0<c.length?new id(c.slice(0),0):null)};vd.o=function(a){for(var b=I(a),c=xc(Td);;)if(b){a=K(K(b));var d=J(b),b=Md(b),c=Ac(c,d,b),b=a}else return zc(c)};vd.A=0;vd.I=function(a){return vd.o(I(a))};
function sg(a,b){this.F=a;this.Ba=b;this.i=32374988;this.B=0}h=sg.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Rb,this.F)):C(Rb,this.F))?this.F.ra(null):K(this.F);return null==a?null:new sg(a,this.Ba)};h.N=function(){return qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};
h.aa=function(){return this.F.aa(null).sb(null)};h.sa=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Rb,this.F)):C(Rb,this.F))?this.F.ra(null):K(this.F);return null!=a?new sg(a,this.Ba):kd};h.S=function(){return this};h.T=function(a,b){return new sg(this.F,b)};h.U=function(a,b){return M(b,this)};sg.prototype[Fb]=function(){return md(this)};function Tf(a){return(a=I(a))?new sg(a,null):null}function te(a){return Zb(a)}
function tg(a,b){this.F=a;this.Ba=b;this.i=32374988;this.B=0}h=tg.prototype;h.toString=function(){return Pc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Rb,this.F)):C(Rb,this.F))?this.F.ra(null):K(this.F);return null==a?null:new tg(a,this.Ba)};h.N=function(){return qd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Ld.b(b,this)};h.$=function(a,b,c){return Ld.c(b,c,this)};
h.aa=function(){return this.F.aa(null).tb(null)};h.sa=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Rb,this.F)):C(Rb,this.F))?this.F.ra(null):K(this.F);return null!=a?new tg(a,this.Ba):kd};h.S=function(){return this};h.T=function(a,b){return new tg(this.F,b)};h.U=function(a,b){return M(b,this)};tg.prototype[Fb]=function(){return md(this)};function Uf(a){return(a=I(a))?new tg(a,null):null}function ue(a){return $b(a)}
function ug(a){return z(Ue(a))?Ib.b(function(a,c){return Nd.b(z(a)?a:Re,c)},a):null}vg;function wg(a){this.kb=a}wg.prototype.xa=function(){return this.kb.xa()};wg.prototype.next=function(){if(this.kb.xa())return this.kb.next().pa[0];throw Error("No such element");};wg.prototype.remove=function(){return Error("Unsupported operation")};function xg(a,b,c){this.u=a;this.$a=b;this.s=c;this.i=15077647;this.B=8196}h=xg.prototype;h.toString=function(){return Pc(this)};
h.equiv=function(a){return this.v(null,a)};h.keys=function(){return md(I(this))};h.entries=function(){var a=I(this);return new Pf(I(a))};h.values=function(){return md(I(this))};h.has=function(a){return he(this,a)};h.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=O(f,0),f=O(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=I(b))be(b)?(c=Gc(b),b=Hc(b),g=c,d=N(c),c=g):(c=J(b),g=O(c,0),f=O(c,1),a.b?a.b(f,g):a.call(null,f,g),b=K(b),c=null,d=0),e=0;else return null};
h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){return Vb(this.$a,b)?b:c};h.Ma=function(){return new wg(Nc(this.$a))};h.R=function(){return this.u};h.X=function(){return Kb(this.$a)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=sd(this)};h.v=function(a,b){return Wd(b)&&N(this)===N(b)&&Te(function(a){return function(b){return he(a,b)}}(this),b)};h.gb=function(){return new vg(xc(this.$a))};h.S=function(){return Tf(this.$a)};h.T=function(a,b){return new xg(b,this.$a,this.s)};
h.U=function(a,b){return new xg(this.u,Sd.c(this.$a,b,null),null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.G(null,a,b)};
xg.prototype[Fb]=function(){return md(this)};function vg(a){this.Pa=a;this.B=136;this.i=259}h=vg.prototype;h.xb=function(a,b){this.Pa=Ac(this.Pa,b,null);return this};h.yb=function(){return new xg(null,zc(this.Pa),null)};h.X=function(){return N(this.Pa)};h.K=function(a,b){return Tb.c(this,b,null)};h.G=function(a,b,c){return Tb.c(this.Pa,b,ee)===ee?c:b};
h.call=function(){function a(a,b,c){return Tb.c(this.Pa,b,ee)===ee?c:b}function b(a,b){return Tb.c(this.Pa,b,ee)===ee?null:b}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,c,e);case 3:return a.call(this,c,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};h.a=function(a){return Tb.c(this.Pa,a,ee)===ee?null:a};h.b=function(a,b){return Tb.c(this.Pa,a,ee)===ee?b:a};
function se(a){if(null!=a&&(a.B&4096||a.Uc))return a.ub(null);if("string"===typeof a)return a;throw Error([F("Doesn't support name: "),F(a)].join(""));}function yg(a,b){if("string"===typeof b){var c=a.exec(b);return Xc.b(J(c),b)?1===N(c)?J(c):ke(c):null}throw new TypeError("re-matches must match against a string.");}
function Cf(a,b,c,d,e,f,g){var k=rb;rb=null==rb?null:rb-1;try{if(null!=rb&&0>rb)return uc(a,"#");uc(a,c);if(0===yb.a(f))I(g)&&uc(a,function(){var a=zg.a(f);return z(a)?a:"..."}());else{if(I(g)){var l=J(g);b.c?b.c(l,a,f):b.call(null,l,a,f)}for(var m=K(g),n=yb.a(f)-1;;)if(!m||null!=n&&0===n){I(m)&&0===n&&(uc(a,d),uc(a,function(){var a=zg.a(f);return z(a)?a:"..."}()));break}else{uc(a,d);var p=J(m);c=a;g=f;b.c?b.c(p,c,g):b.call(null,p,c,g);var q=K(m);c=n-1;m=q;n=c}}return uc(a,e)}finally{rb=k}}
function Ag(a,b){for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f);uc(a,g);f+=1}else if(c=I(c))d=c,be(d)?(c=Gc(d),e=Hc(d),d=c,g=N(c),c=e,e=g):(g=J(d),uc(a,g),c=K(d),d=null,e=0),f=0;else return null}var Bg={'"':'\\"',"\\":"\\\\","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t"};function Cg(a){return[F('"'),F(a.replace(RegExp('[\\\\"\b\f\n\r\t]',"g"),function(a){return Bg[a]})),F('"')].join("")}Dg;
function Eg(a,b){var c=ge(ed.b(a,wb));return c?(c=null!=b?b.i&131072||b.Tc?!0:!1:!1)?null!=Vd(b):c:c}
function Fg(a,b,c){if(null==a)return uc(b,"nil");if(Eg(c,a)){uc(b,"^");var d=Vd(a);Df.c?Df.c(d,b,c):Df.call(null,d,b,c);uc(b," ")}if(a.yc)return a.bd(b);if(null!=a&&(a.i&2147483648||a.P))return a.L(null,b,c);if(!0===a||!1===a||"number"===typeof a)return uc(b,""+F(a));if(null!=a&&a.constructor===Object)return uc(b,"#js "),d=re.b(function(b){return new P(null,2,5,U,[Be.a(b),a[b]],null)},ce(a)),Dg.m?Dg.m(d,Df,b,c):Dg.call(null,d,Df,b,c);if(Cb(a))return Cf(b,Df,"#js ["," ","]",c,a);if(ga(a))return z(vb.a(c))?
uc(b,Cg(a)):uc(b,a);if(ha(a)){var e=a.name;c=z(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Function":e;return Ag(b,gd(["#object[",c,' "',""+F(a),'"]'],0))}if(a instanceof Date)return c=function(a,b){for(var c=""+F(a);;)if(N(c)<b)c=[F("0"),F(c)].join("");else return c},Ag(b,gd(['#inst "',""+F(a.getUTCFullYear()),"-",c(a.getUTCMonth()+1,2),"-",c(a.getUTCDate(),2),"T",c(a.getUTCHours(),2),":",c(a.getUTCMinutes(),2),":",c(a.getUTCSeconds(),2),".",c(a.getUTCMilliseconds(),3),"-",'00:00"'],
0));if(a instanceof RegExp)return Ag(b,gd(['#"',a.source,'"'],0));if(null!=a&&(a.i&2147483648||a.P))return vc(a,b,c);if(z(a.constructor.Sb))return Ag(b,gd(["#object[",a.constructor.Sb.replace(RegExp("/","g"),"."),"]"],0));e=a.constructor.name;c=z(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Object":e;return Ag(b,gd(["#object[",c," ",""+F(a),"]"],0))}function Df(a,b,c){var d=Gg.a(c);return z(d)?(c=Sd.c(c,Hg,Fg),d.c?d.c(a,b,c):d.call(null,a,b,c)):Fg(a,b,c)}
var Ze=function Ze(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Ze.o(0<c.length?new id(c.slice(0),0):null)};Ze.o=function(a){var b=tb();if(null==a||Db(I(a)))b="";else{var c=F,d=new mb;a:{var e=new Oc(d);Df(J(a),e,b);a=I(K(a));for(var f=null,g=0,k=0;;)if(k<g){var l=f.O(null,k);uc(e," ");Df(l,e,b);k+=1}else if(a=I(a))f=a,be(f)?(a=Gc(f),g=Hc(f),f=a,l=N(a),a=g,g=l):(l=J(f),uc(e," "),Df(l,e,b),a=K(f),f=null,g=0),k=0;else break a}b=""+c(d)}return b};Ze.A=0;
Ze.I=function(a){return Ze.o(I(a))};function Dg(a,b,c,d){return Cf(c,function(a,c,d){var k=Zb(a);b.c?b.c(k,c,d):b.call(null,k,c,d);uc(c," ");a=$b(a);return b.c?b.c(a,c,d):b.call(null,a,c,d)},"{",", ","}",d,I(a))}df.prototype.P=!0;df.prototype.L=function(a,b,c){uc(b,"#object [cljs.core.Volatile ");Df(new y(null,1,[Ig,this.state],null),b,c);return uc(b,"]")};id.prototype.P=!0;id.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Ce.prototype.P=!0;
Ce.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};mg.prototype.P=!0;mg.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};rg.prototype.P=!0;rg.prototype.L=function(a,b,c){return Cf(b,Df,"["," ","]",c,this)};Sf.prototype.P=!0;Sf.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};od.prototype.P=!0;od.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};ae.prototype.P=!0;ae.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};
ze.prototype.P=!0;ze.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Gd.prototype.P=!0;Gd.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Rd.prototype.P=!0;Rd.prototype.L=function(a,b,c){return Dg(this,Df,b,c)};ng.prototype.P=!0;ng.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Hf.prototype.P=!0;Hf.prototype.L=function(a,b,c){return Cf(b,Df,"["," ","]",c,this)};xg.prototype.P=!0;xg.prototype.L=function(a,b,c){return Cf(b,Df,"#{"," ","}",c,this)};
$d.prototype.P=!0;$d.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Xe.prototype.P=!0;Xe.prototype.L=function(a,b,c){uc(b,"#object [cljs.core.Atom ");Df(new y(null,1,[Ig,this.state],null),b,c);return uc(b,"]")};tg.prototype.P=!0;tg.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};qg.prototype.P=!0;qg.prototype.L=function(a,b,c){return Cf(b,Df,"["," ","]",c,this)};P.prototype.P=!0;P.prototype.L=function(a,b,c){return Cf(b,Df,"["," ","]",c,this)};xe.prototype.P=!0;
xe.prototype.L=function(a,b){return uc(b,"()")};Se.prototype.P=!0;Se.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};y.prototype.P=!0;y.prototype.L=function(a,b,c){return Dg(this,Df,b,c)};sg.prototype.P=!0;sg.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Hd.prototype.P=!0;Hd.prototype.L=function(a,b,c){return Cf(b,Df,"("," ",")",c,this)};Wc.prototype.qb=!0;
Wc.prototype.fb=function(a,b){if(b instanceof Wc)return dd(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};B.prototype.qb=!0;B.prototype.fb=function(a,b){if(b instanceof B)return Ae(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};Hf.prototype.qb=!0;Hf.prototype.fb=function(a,b){if(Zd(b))return ie(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};P.prototype.qb=!0;
P.prototype.fb=function(a,b){if(Zd(b))return ie(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};function Jg(a){return function(b,c){var d=a.b?a.b(b,c):a.call(null,b,c);return zd(d)?new yd(d):d}}
function ef(a){return function(b){return function(){function c(a,c){return Ib.c(b,a,c)}function d(b){return a.a?a.a(b):a.call(null,b)}function e(){return a.w?a.w():a.call(null)}var f=null,f=function(a,b){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b)}throw Error("Invalid arity: "+arguments.length);};f.w=e;f.a=d;f.b=c;return f}()}(Jg(a))}Kg;function Lg(){}
var Mg=function Mg(b){if(null!=b&&null!=b.Qc)return b.Qc(b);var c=Mg[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Mg._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEncodeJS.-clj-\x3ejs",b);};Ng;function Og(a){return(null!=a?a.Pc||(a.zb?0:C(Lg,a)):C(Lg,a))?Mg(a):"string"===typeof a||"number"===typeof a||a instanceof B||a instanceof Wc?Ng.a?Ng.a(a):Ng.call(null,a):Ze.o(gd([a],0))}
var Ng=function Ng(b){if(null==b)return null;if(null!=b?b.Pc||(b.zb?0:C(Lg,b)):C(Lg,b))return Mg(b);if(b instanceof B)return se(b);if(b instanceof Wc)return""+F(b);if(Yd(b)){var c={};b=I(b);for(var d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);c[Og(k)]=Ng(g);f+=1}else if(b=I(b))be(b)?(e=Gc(b),b=Hc(b),d=e,e=N(e)):(e=J(b),d=O(e,0),e=O(e,1),c[Og(d)]=Ng(e),b=K(b),d=null,e=0),f=0;else break;return c}if(null==b?0:null!=b?b.i&8||b.sd||(b.i?0:C(Lb,b)):C(Lb,b)){c=[];b=I(re.b(Ng,b));d=null;for(f=
e=0;;)if(f<e)k=d.O(null,f),c.push(k),f+=1;else if(b=I(b))d=b,be(d)?(b=Gc(d),f=Hc(d),d=b,e=N(b),b=f):(b=J(d),c.push(b),b=K(d),d=null,e=0),f=0;else break;return c}return b},Kg=function Kg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Kg.w();case 1:return Kg.a(arguments[0]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Kg.w=function(){return Kg.a(1)};Kg.a=function(a){return Math.random()*a};Kg.A=1;var Pg=null;
function Qg(){if(null==Pg){var a=new y(null,3,[Rg,Re,Sg,Re,Tg,Re],null);Pg=V.a?V.a(a):V.call(null,a)}return Pg}function Ug(a,b,c){var d=Xc.b(b,c);if(!d&&!(d=he(Tg.a(a).call(null,b),c))&&(d=Zd(c))&&(d=Zd(b)))if(d=N(c)===N(b))for(var d=!0,e=0;;)if(d&&e!==N(c))d=Ug(a,b.a?b.a(e):b.call(null,e),c.a?c.a(e):c.call(null,e)),e+=1;else return d;else return d;else return d}function Vg(a){var b;b=Qg();b=L.a?L.a(b):L.call(null,b);a=ed.b(Rg.a(b),a);return I(a)?a:null}
function Wg(a,b,c,d){cf.b(a,function(){return L.a?L.a(b):L.call(null,b)});cf.b(c,function(){return L.a?L.a(d):L.call(null,d)})}var Xg=function Xg(b,c,d){var e=(L.a?L.a(d):L.call(null,d)).call(null,b),e=z(z(e)?e.a?e.a(c):e.call(null,c):e)?!0:null;if(z(e))return e;e=function(){for(var e=Vg(c);;)if(0<N(e))Xg(b,J(e),d),e=jd(e);else return null}();if(z(e))return e;e=function(){for(var e=Vg(b);;)if(0<N(e))Xg(J(e),c,d),e=jd(e);else return null}();return z(e)?e:!1};
function Yg(a,b,c){c=Xg(a,b,c);if(z(c))a=c;else{c=Ug;var d;d=Qg();d=L.a?L.a(d):L.call(null,d);a=c(d,a,b)}return a}
var Zg=function Zg(b,c,d,e,f,g,k){var l=Ib.c(function(e,g){var k=O(g,0);O(g,1);if(Ug(L.a?L.a(d):L.call(null,d),c,k)){var l;l=(l=null==e)?l:Yg(k,J(e),f);l=z(l)?g:e;if(!z(Yg(J(l),k,f)))throw Error([F("Multiple methods in multimethod '"),F(b),F("' match dispatch value: "),F(c),F(" -\x3e "),F(k),F(" and "),F(J(l)),F(", and neither is preferred")].join(""));return l}return e},null,L.a?L.a(e):L.call(null,e));if(z(l)){if(Xc.b(L.a?L.a(k):L.call(null,k),L.a?L.a(d):L.call(null,d)))return cf.m(g,Sd,c,Md(l)),
Md(l);Wg(g,e,k,d);return Zg(b,c,d,e,f,g,k)}return null};function W(a,b){throw Error([F("No method in multimethod '"),F(a),F("' for dispatch value: "),F(b)].join(""));}function $g(a,b,c,d,e,f,g,k){this.name=a;this.h=b;this.gd=c;this.Eb=d;this.lb=e;this.nd=f;this.Ib=g;this.ob=k;this.i=4194305;this.B=4352}h=$g.prototype;
h.call=function(){function a(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H,R){a=this;var pa=Hb.o(a.h,b,c,d,e,gd([f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H,R],0)),vh=X(this,pa);z(vh)||W(a.name,pa);return Hb.o(vh,b,c,d,e,gd([f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H,R],0))}function b(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H){a=this;var R=a.h.ma?a.h.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H),pa=X(this,R);z(pa)||W(a.name,R);return pa.ma?pa.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,
t,v,w,A,x,E,H):pa.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E,H)}function c(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E){a=this;var H=a.h.la?a.h.la(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E),R=X(this,H);z(R)||W(a.name,H);return R.la?R.la(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E):R.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x,E)}function d(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x){a=this;var E=a.h.ka?a.h.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x):a.h.call(null,
b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x),H=X(this,E);z(H)||W(a.name,E);return H.ka?H.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x):H.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,x)}function e(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A){a=this;var x=a.h.ja?a.h.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A),E=X(this,x);z(E)||W(a.name,x);return E.ja?E.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):E.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A)}function f(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,
w){a=this;var A=a.h.ia?a.h.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w),x=X(this,A);z(x)||W(a.name,A);return x.ia?x.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):x.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w)}function g(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){a=this;var w=a.h.ha?a.h.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v),A=X(this,w);z(A)||W(a.name,w);return A.ha?A.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):A.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)}
function k(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){a=this;var v=a.h.ga?a.h.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,t):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t),w=X(this,v);z(w)||W(a.name,v);return w.ga?w.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,t):w.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t)}function l(a,b,c,d,e,f,g,k,l,m,n,p,q,r){a=this;var t=a.h.fa?a.h.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r),v=X(this,t);z(v)||W(a.name,t);return v.fa?v.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):v.call(null,b,c,d,e,f,g,k,l,m,n,p,
q,r)}function m(a,b,c,d,e,f,g,k,l,m,n,p,q){a=this;var r=a.h.ea?a.h.ea(b,c,d,e,f,g,k,l,m,n,p,q):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q),t=X(this,r);z(t)||W(a.name,r);return t.ea?t.ea(b,c,d,e,f,g,k,l,m,n,p,q):t.call(null,b,c,d,e,f,g,k,l,m,n,p,q)}function n(a,b,c,d,e,f,g,k,l,m,n,p){a=this;var q=a.h.da?a.h.da(b,c,d,e,f,g,k,l,m,n,p):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p),r=X(this,q);z(r)||W(a.name,q);return r.da?r.da(b,c,d,e,f,g,k,l,m,n,p):r.call(null,b,c,d,e,f,g,k,l,m,n,p)}function p(a,b,c,d,e,f,g,k,l,m,
n){a=this;var p=a.h.ca?a.h.ca(b,c,d,e,f,g,k,l,m,n):a.h.call(null,b,c,d,e,f,g,k,l,m,n),q=X(this,p);z(q)||W(a.name,p);return q.ca?q.ca(b,c,d,e,f,g,k,l,m,n):q.call(null,b,c,d,e,f,g,k,l,m,n)}function q(a,b,c,d,e,f,g,k,l,m){a=this;var n=a.h.oa?a.h.oa(b,c,d,e,f,g,k,l,m):a.h.call(null,b,c,d,e,f,g,k,l,m),p=X(this,n);z(p)||W(a.name,n);return p.oa?p.oa(b,c,d,e,f,g,k,l,m):p.call(null,b,c,d,e,f,g,k,l,m)}function r(a,b,c,d,e,f,g,k,l){a=this;var m=a.h.na?a.h.na(b,c,d,e,f,g,k,l):a.h.call(null,b,c,d,e,f,g,k,l),n=
X(this,m);z(n)||W(a.name,m);return n.na?n.na(b,c,d,e,f,g,k,l):n.call(null,b,c,d,e,f,g,k,l)}function t(a,b,c,d,e,f,g,k){a=this;var l=a.h.W?a.h.W(b,c,d,e,f,g,k):a.h.call(null,b,c,d,e,f,g,k),m=X(this,l);z(m)||W(a.name,l);return m.W?m.W(b,c,d,e,f,g,k):m.call(null,b,c,d,e,f,g,k)}function v(a,b,c,d,e,f,g){a=this;var k=a.h.V?a.h.V(b,c,d,e,f,g):a.h.call(null,b,c,d,e,f,g),l=X(this,k);z(l)||W(a.name,k);return l.V?l.V(b,c,d,e,f,g):l.call(null,b,c,d,e,f,g)}function w(a,b,c,d,e,f){a=this;var g=a.h.C?a.h.C(b,c,
d,e,f):a.h.call(null,b,c,d,e,f),k=X(this,g);z(k)||W(a.name,g);return k.C?k.C(b,c,d,e,f):k.call(null,b,c,d,e,f)}function A(a,b,c,d,e){a=this;var f=a.h.m?a.h.m(b,c,d,e):a.h.call(null,b,c,d,e),g=X(this,f);z(g)||W(a.name,f);return g.m?g.m(b,c,d,e):g.call(null,b,c,d,e)}function E(a,b,c,d){a=this;var e=a.h.c?a.h.c(b,c,d):a.h.call(null,b,c,d),f=X(this,e);z(f)||W(a.name,e);return f.c?f.c(b,c,d):f.call(null,b,c,d)}function H(a,b,c){a=this;var d=a.h.b?a.h.b(b,c):a.h.call(null,b,c),e=X(this,d);z(e)||W(a.name,
d);return e.b?e.b(b,c):e.call(null,b,c)}function R(a,b){a=this;var c=a.h.a?a.h.a(b):a.h.call(null,b),d=X(this,c);z(d)||W(a.name,c);return d.a?d.a(b):d.call(null,b)}function pa(a){a=this;var b=a.h.w?a.h.w():a.h.call(null),c=X(this,b);z(c)||W(a.name,b);return c.w?c.w():c.call(null)}var x=null,x=function(x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib,Ab,Ub,Bc,ud,of){switch(arguments.length){case 1:return pa.call(this,x);case 2:return R.call(this,x,Q);case 3:return H.call(this,x,Q,S);case 4:return E.call(this,
x,Q,S,T);case 5:return A.call(this,x,Q,S,T,Z);case 6:return w.call(this,x,Q,S,T,Z,ba);case 7:return v.call(this,x,Q,S,T,Z,ba,ea);case 8:return t.call(this,x,Q,S,T,Z,ba,ea,ja);case 9:return r.call(this,x,Q,S,T,Z,ba,ea,ja,ma);case 10:return q.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa);case 11:return p.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta);case 12:return n.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa);case 13:return m.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia);case 14:return l.call(this,x,Q,S,T,Z,ba,ea,ja,ma,
oa,ta,xa,Ia,Ma);case 15:return k.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic);case 16:return g.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa);case 17:return f.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib);case 18:return e.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib,Ab);case 19:return d.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib,Ab,Ub);case 20:return c.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib,Ab,Ub,Bc);case 21:return b.call(this,x,Q,S,
T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib,Ab,Ub,Bc,ud);case 22:return a.call(this,x,Q,S,T,Z,ba,ea,ja,ma,oa,ta,xa,Ia,Ma,ic,Xa,ib,Ab,Ub,Bc,ud,of)}throw Error("Invalid arity: "+arguments.length);};x.a=pa;x.b=R;x.c=H;x.m=E;x.C=A;x.V=w;x.W=v;x.na=t;x.oa=r;x.ca=q;x.da=p;x.ea=n;x.fa=m;x.ga=l;x.ha=k;x.ia=g;x.ja=f;x.ka=e;x.la=d;x.ma=c;x.lc=b;x.rb=a;return x}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Gb(b)))};
h.w=function(){var a=this.h.w?this.h.w():this.h.call(null),b=X(this,a);z(b)||W(this.name,a);return b.w?b.w():b.call(null)};h.a=function(a){var b=this.h.a?this.h.a(a):this.h.call(null,a),c=X(this,b);z(c)||W(this.name,b);return c.a?c.a(a):c.call(null,a)};h.b=function(a,b){var c=this.h.b?this.h.b(a,b):this.h.call(null,a,b),d=X(this,c);z(d)||W(this.name,c);return d.b?d.b(a,b):d.call(null,a,b)};
h.c=function(a,b,c){var d=this.h.c?this.h.c(a,b,c):this.h.call(null,a,b,c),e=X(this,d);z(e)||W(this.name,d);return e.c?e.c(a,b,c):e.call(null,a,b,c)};h.m=function(a,b,c,d){var e=this.h.m?this.h.m(a,b,c,d):this.h.call(null,a,b,c,d),f=X(this,e);z(f)||W(this.name,e);return f.m?f.m(a,b,c,d):f.call(null,a,b,c,d)};h.C=function(a,b,c,d,e){var f=this.h.C?this.h.C(a,b,c,d,e):this.h.call(null,a,b,c,d,e),g=X(this,f);z(g)||W(this.name,f);return g.C?g.C(a,b,c,d,e):g.call(null,a,b,c,d,e)};
h.V=function(a,b,c,d,e,f){var g=this.h.V?this.h.V(a,b,c,d,e,f):this.h.call(null,a,b,c,d,e,f),k=X(this,g);z(k)||W(this.name,g);return k.V?k.V(a,b,c,d,e,f):k.call(null,a,b,c,d,e,f)};h.W=function(a,b,c,d,e,f,g){var k=this.h.W?this.h.W(a,b,c,d,e,f,g):this.h.call(null,a,b,c,d,e,f,g),l=X(this,k);z(l)||W(this.name,k);return l.W?l.W(a,b,c,d,e,f,g):l.call(null,a,b,c,d,e,f,g)};
h.na=function(a,b,c,d,e,f,g,k){var l=this.h.na?this.h.na(a,b,c,d,e,f,g,k):this.h.call(null,a,b,c,d,e,f,g,k),m=X(this,l);z(m)||W(this.name,l);return m.na?m.na(a,b,c,d,e,f,g,k):m.call(null,a,b,c,d,e,f,g,k)};h.oa=function(a,b,c,d,e,f,g,k,l){var m=this.h.oa?this.h.oa(a,b,c,d,e,f,g,k,l):this.h.call(null,a,b,c,d,e,f,g,k,l),n=X(this,m);z(n)||W(this.name,m);return n.oa?n.oa(a,b,c,d,e,f,g,k,l):n.call(null,a,b,c,d,e,f,g,k,l)};
h.ca=function(a,b,c,d,e,f,g,k,l,m){var n=this.h.ca?this.h.ca(a,b,c,d,e,f,g,k,l,m):this.h.call(null,a,b,c,d,e,f,g,k,l,m),p=X(this,n);z(p)||W(this.name,n);return p.ca?p.ca(a,b,c,d,e,f,g,k,l,m):p.call(null,a,b,c,d,e,f,g,k,l,m)};h.da=function(a,b,c,d,e,f,g,k,l,m,n){var p=this.h.da?this.h.da(a,b,c,d,e,f,g,k,l,m,n):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n),q=X(this,p);z(q)||W(this.name,p);return q.da?q.da(a,b,c,d,e,f,g,k,l,m,n):q.call(null,a,b,c,d,e,f,g,k,l,m,n)};
h.ea=function(a,b,c,d,e,f,g,k,l,m,n,p){var q=this.h.ea?this.h.ea(a,b,c,d,e,f,g,k,l,m,n,p):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p),r=X(this,q);z(r)||W(this.name,q);return r.ea?r.ea(a,b,c,d,e,f,g,k,l,m,n,p):r.call(null,a,b,c,d,e,f,g,k,l,m,n,p)};h.fa=function(a,b,c,d,e,f,g,k,l,m,n,p,q){var r=this.h.fa?this.h.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q),t=X(this,r);z(t)||W(this.name,r);return t.fa?t.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):t.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q)};
h.ga=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r){var t=this.h.ga?this.h.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r),v=X(this,t);z(v)||W(this.name,t);return v.ga?v.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):v.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r)};
h.ha=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){var v=this.h.ha?this.h.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t),w=X(this,v);z(w)||W(this.name,v);return w.ha?w.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t):w.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t)};
h.ia=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){var w=this.h.ia?this.h.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v),A=X(this,w);z(A)||W(this.name,w);return A.ia?A.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):A.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)};
h.ja=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w){var A=this.h.ja?this.h.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w),E=X(this,A);z(E)||W(this.name,A);return E.ja?E.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w):E.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w)};
h.ka=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A){var E=this.h.ka?this.h.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A),H=X(this,E);z(H)||W(this.name,E);return H.ka?H.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A):H.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A)};
h.la=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E){var H=this.h.la?this.h.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E),R=X(this,H);z(R)||W(this.name,H);return R.la?R.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E):R.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E)};
h.ma=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H){var R=this.h.ma?this.h.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H),pa=X(this,R);z(pa)||W(this.name,R);return pa.ma?pa.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H):pa.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H)};
h.lc=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R){var pa=Hb.o(this.h,a,b,c,d,gd([e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R],0)),x=X(this,pa);z(x)||W(this.name,pa);return Hb.o(x,a,b,c,d,gd([e,f,g,k,l,m,n,p,q,r,t,v,w,A,E,H,R],0))};function ah(a,b){var c=bh;cf.m(c.lb,Sd,a,b);Wg(c.Ib,c.lb,c.ob,c.Eb)}
function X(a,b){Xc.b(L.a?L.a(a.ob):L.call(null,a.ob),L.a?L.a(a.Eb):L.call(null,a.Eb))||Wg(a.Ib,a.lb,a.ob,a.Eb);var c=(L.a?L.a(a.Ib):L.call(null,a.Ib)).call(null,b);if(z(c))return c;c=Zg(a.name,b,a.Eb,a.lb,a.nd,a.Ib,a.ob);return z(c)?c:(L.a?L.a(a.lb):L.call(null,a.lb)).call(null,a.gd)}h.ub=function(){return Jc(this.name)};h.vb=function(){return Kc(this.name)};h.N=function(){return ia(this)};var ch=new B(null,"orders","orders",-1032870176),dh=new B(null,"from-date","from-date",1469949792),eh=new B(null,"date","date",-1463434462),fh=new B(null,"remove","remove",-131428414),wb=new B(null,"meta","meta",1499536964),gh=new B(null,"color","color",1011675173),xb=new B(null,"dup","dup",556298533),hh=new B(null,"couriers","couriers",-1702205146),bf=new Wc(null,"new-value","new-value",-1567397401,null),Ye=new B(null,"validator","validator",-1966190681),ih=new B(null,"to-date","to-date",500848648),
jh=new B(null,"default","default",-1987822328),kh=new B(null,"name","name",1843675177),lh=new B(null,"value","value",305978217),mh=new B(null,"coll","coll",1647737163),Ig=new B(null,"val","val",128701612),nh=new B(null,"type","type",1174270348),af=new Wc(null,"validate","validate",1439230700,null),Hg=new B(null,"fallback-impl","fallback-impl",-1501286995),ub=new B(null,"flush-on-newline","flush-on-newline",-151457939),Sg=new B(null,"descendants","descendants",1824886031),oh=new B(null,"title","title",
636505583),Tg=new B(null,"ancestors","ancestors",-776045424),ph=new B(null,"style","style",-496642736),qh=new B(null,"cancelled","cancelled",488726224),rh=new B(null,"div","div",1057191632),vb=new B(null,"readably","readably",1129599760),zg=new B(null,"more-marker","more-marker",-14717935),sh=new B(null,"google-map","google-map",1960730035),th=new B(null,"status","status",-1997798413),yb=new B(null,"print-length","print-length",1931866356),uh=new B(null,"unassigned","unassigned",-1438879244),wh=new B(null,
"id","id",-1388402092),xh=new B(null,"class","class",-2030961996),yh=new B(null,"checked","checked",-50955819),Rg=new B(null,"parents","parents",-2027538891),zh=new B(null,"lat","lat",-580793929),Ah=new B(null,"br","br",934104792),Bh=new B(null,"complete","complete",-500388775),Ch=new B(null,"input","input",556931961),Dh=new B(null,"xhtml","xhtml",1912943770),Qe=new Wc(null,"quote","quote",1377916282,null),Pe=new B(null,"arglists","arglists",1661989754),Eh=new B(null,"couriers-control","couriers-control",
1386141787),Oe=new Wc(null,"nil-iter","nil-iter",1101030523,null),Fh=new B(null,"add","add",235287739),Gh=new B(null,"hierarchy","hierarchy",-1053470341),Gg=new B(null,"alt-impl","alt-impl",670969595),Hh=new B(null,"selected?","selected?",-742502788),Ih=new B(null,"lng","lng",1667213918),Jh=new B(null,"servicing","servicing",-1502937442),Kh=new B(null,"text","text",-1790561697),Lh=new B(null,"enroute","enroute",-1681821057),Mh=new B(null,"attr","attr",-604132353);function Nh(a){var b=/\./;if("string"===typeof b)return a.replace(new RegExp(za(b),"g")," ");if(b instanceof RegExp)return a.replace(new RegExp(b.source,"g")," ");throw[F("Invalid match arg: "),F(b)].join("");};var Oh={};function Ph(a,b){var c=Oh[b];if(!c){var d=Ba(b),c=d;void 0===a.style[d]&&(d=(db?"Webkit":cb?"Moz":ab?"ms":$a?"O":null)+Ca(d),void 0!==a.style[d]&&(c=d));Oh[b]=c}return c};function Qh(){}function Rh(){}var Sh=function Sh(b){if(null!=b&&null!=b.dd)return b.dd(b);var c=Sh[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Sh._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("bindable.-value",b);},Th=function Th(b,c){if(null!=b&&null!=b.cd)return b.cd(b,c);var d=Th[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Th._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("bindable.-on-change",b);};
function Uh(a){return null!=a?a.zd?!0:a.zb?!1:C(Rh,a):C(Rh,a)}function Vh(a){return null!=a?a.Ad?!0:a.zb?!1:C(Qh,a):C(Qh,a)}function Wh(a,b){return Th(a,b)};var Xh=new y(null,2,[Dh,"http://www.w3.org/1999/xhtml",new B(null,"svg","svg",856789142),"http://www.w3.org/2000/svg"],null);Yh;Zh;$h;V.a?V.a(0):V.call(null,0);var ai=V.a?V.a(Od):V.call(null,Od);function bi(a,b){cf.c(ai,Nd,new P(null,2,5,U,[a,b],null))}function ci(){}
var di=function di(b){if(null!=b&&null!=b.fd)return b.fd(b);var c=di[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=di._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("Element.-elem",b);},ei=function ei(b,c){for(var d=I(c),e=null,f=0,g=0;;)if(g<f){var k=e.O(null,g),l;if(null!=k?k.ed||(k.zb?0:C(ci,k)):C(ci,k))l=di(k);else if(null==k)l=null;else{if(Yd(k))throw"Maps cannot be used as content";"string"===typeof k?l=document.createTextNode(String(k)):Zd(k)?l=Yh.a?Yh.a(k):Yh.call(null,
k):fe(k)?l=ei(b,k):z(Vh(k))?(bi(mh,k),l=ei(b,new P(null,1,5,U,[Sh(k)],null))):z(Uh(k))?(bi(Kh,k),l=ei(b,new P(null,1,5,U,[Sh(k)],null))):l=z(k.nodeName)?k:z(k.get)?k.get(0):function(){var b=""+F(k);return document.createTextNode(String(b))}()}z(l)&&b.appendChild(l);g+=1}else if(d=I(d)){if(be(d))f=Gc(d),d=Hc(d),e=f,f=N(f);else{k=J(d);if(null!=k?k.ed||(k.zb?0:C(ci,k)):C(ci,k))e=di(k);else if(null==k)e=null;else{if(Yd(k))throw"Maps cannot be used as content";"string"===typeof k?e=document.createTextNode(String(k)):
Zd(k)?e=Yh.a?Yh.a(k):Yh.call(null,k):fe(k)?e=ei(b,k):z(Vh(k))?(bi(mh,k),e=ei(b,new P(null,1,5,U,[Sh(k)],null))):z(Uh(k))?(bi(Kh,k),e=ei(b,new P(null,1,5,U,[Sh(k)],null))):e=z(k.nodeName)?k:z(k.get)?k.get(0):function(){var b=""+F(k);return document.createTextNode(String(b))}()}z(e)&&b.appendChild(e);d=K(d);e=null;f=0}g=0}else return null};
if("undefined"===typeof bh)var bh=function(){var a=V.a?V.a(Re):V.call(null,Re),b=V.a?V.a(Re):V.call(null,Re),c=V.a?V.a(Re):V.call(null,Re),d=V.a?V.a(Re):V.call(null,Re),e=ed.c(Re,Gh,Qg());return new $g(fd.b("crate.compiler","dom-binding"),function(){return function(a){return a}}(a,b,c,d,e),jh,e,a,b,c,d)}();ah(Kh,function(a,b,c){return Wh(b,function(a){for(var b;b=c.firstChild;)c.removeChild(b);return ei(c,new P(null,1,5,U,[a],null))})});
ah(Mh,function(a,b,c){a=O(b,0);var d=O(b,1);return Wh(d,function(a,b){return function(a){return Zh.c?Zh.c(c,b,a):Zh.call(null,c,b,a)}}(b,a,d))});ah(ph,function(a,b,c){a=O(b,0);var d=O(b,1);return Wh(d,function(a,b){return function(a){return z(b)?$h.c?$h.c(c,b,a):$h.call(null,c,b,a):$h.b?$h.b(c,a):$h.call(null,c,a)}}(b,a,d))});
ah(mh,function(a,b,c){return Wh(b,function(a,e,f){if(z(Xc.b?Xc.b(Fh,a):Xc.call(null,Fh,a)))return a=b.md.call(null,Fh),z(a)?e=a.c?a.c(c,e,f):a.call(null,c,e,f):(c.appendChild(e),e=void 0),e;if(z(Xc.b?Xc.b(fh,a):Xc.call(null,fh,a)))return f=b.md.call(null,fh),z(f)?f.a?f.a(e):f.call(null,e):e&&e.parentNode?e.parentNode.removeChild(e):null;throw Error([F("No matching clause: "),F(a)].join(""));})});
var $h=function $h(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return $h.b(arguments[0],arguments[1]);case 3:return $h.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
$h.b=function(a,b){if("string"===typeof b)a.setAttribute("style",b);else if(Yd(b))for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);$h.c(a,k,g);f+=1}else if(c=I(c))be(c)?(e=Gc(c),c=Hc(c),d=e,e=N(e)):(e=J(c),d=O(e,0),e=O(e,1),$h.c(a,d,e),c=K(c),d=null,e=0),f=0;else break;else z(Uh(b))&&(bi(ph,new P(null,2,5,U,[null,b],null)),$h.b(a,Sh(b)));return a};
$h.c=function(a,b,c){z(Uh(c))&&(bi(ph,new P(null,2,5,U,[b,c],null)),c=Sh(c));b=se(b);if(ga(b)){var d=Ph(a,b);d&&(a.style[d]=c)}else for(d in b){c=a;var e=b[d],f=Ph(c,d);f&&(c.style[f]=e)}};$h.A=3;var Zh=function Zh(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Zh.b(arguments[0],arguments[1]);case 3:return Zh.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Zh.b=function(a,b){if(z(a)){if(Yd(b)){for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);Zh.c(a,k,g);f+=1}else if(c=I(c))be(c)?(e=Gc(c),c=Hc(c),d=e,e=N(e)):(e=J(c),d=O(e,0),e=O(e,1),Zh.c(a,d,e),c=K(c),d=null,e=0),f=0;else break;return a}return a.getAttribute(se(b))}return null};Zh.c=function(a,b,c){Xc.b(b,ph)?$h.b(a,c):(z(Uh(c))&&(bi(Mh,new P(null,2,5,U,[b,c],null)),c=Sh(c)),a.setAttribute(se(b),c));return a};Zh.A=3;var fi=/([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?/;
function gi(a){return gf.b(Re,re.b(function(a){var c=O(a,0);a=O(a,1);return!0===a?new P(null,2,5,U,[c,se(c)],null):new P(null,2,5,U,[c,a],null)},ff(Ve.b(ge,Md),a)))}
function hi(a){var b=O(a,0),c=qe(a);if(!(b instanceof B||b instanceof Wc||"string"===typeof b))throw[F(b),F(" is not a valid tag name.")].join("");var d=yg(fi,se(b)),e=O(d,0),f=O(d,1),g=O(d,2),k=O(d,3),l=function(){var a,b=/:/;a:for(b="/(?:)/"===""+F(b)?Nd.b(ke(M("",re.b(F,I(f)))),""):ke((""+F(f)).split(b));;)if(""===(null==b?null:bc(b)))b=null==b?null:cc(b);else break a;a=b;b=O(a,0);a=O(a,1);var c;c=Be.a(b);c=Xh.a?Xh.a(c):Xh.call(null,c);return z(a)?new P(null,2,5,U,[z(c)?c:b,a],null):new P(null,
2,5,U,[Dh.a(Xh),b],null)}(),m=O(l,0),n=O(l,1);a=gf.b(Re,ff(function(){return function(a){return null!=Md(a)}}(d,e,f,g,k,l,m,n,a,b,c),new y(null,2,[wh,z(g)?g:null,xh,z(k)?Nh(k):null],null)));b=J(c);return Yd(b)?new P(null,4,5,U,[m,n,ug(gd([a,gi(b)],0)),K(c)],null):new P(null,4,5,U,[m,n,a,c],null)}var ii=z(document.createElementNS)?function(a,b){return document.createElementNS(a,b)}:function(a,b){return document.createElement(b)};
function Yh(a){var b=ai;ai=V.a?V.a(Od):V.call(null,Od);try{var c=hi(a),d=O(c,0),e=O(c,1),f=O(c,2),g=O(c,3),k=ii.b?ii.b(d,e):ii.call(null,d,e);Zh.b(k,f);ei(k,g);a:{var l=L.a?L.a(ai):L.call(null,ai),m=I(l);a=null;for(d=c=0;;)if(d<c){var n=a.O(null,d),p=O(n,0),q=O(n,1);bh.c?bh.c(p,q,k):bh.call(null,p,q,k);d+=1}else{var r=I(m);if(r){e=r;if(be(e)){var t=Gc(e),v=Hc(e),e=t,w=N(t),m=v;a=e;c=w}else{var A=J(e),p=O(A,0),q=O(A,1);bh.c?bh.c(p,q,k):bh.call(null,p,q,k);m=K(e);a=null;c=0}d=0}else break a}}return k}finally{ai=
b}};V.a?V.a(0):V.call(null,0);function ji(a){a=re.b(Yh,a);return z(Md(a))?a:J(a)};[].push(function(){});function ki(){0!=li&&(mi[ia(this)]=this);this.Bb=this.Bb;this.Xb=this.Xb}var li=0,mi={};ki.prototype.Bb=!1;ki.prototype.Ab=function(){if(this.Xb)for(;this.Xb.length;)this.Xb.shift()()};var ni=!ab||9<=lb,oi=ab&&!jb("9");!db||jb("528");cb&&jb("1.9b")||ab&&jb("8")||$a&&jb("9.5")||db&&jb("528");cb&&!jb("8")||ab&&jb("9");function pi(a,b){this.type=a;this.currentTarget=this.target=b;this.defaultPrevented=this.cb=!1;this.Gc=!0}pi.prototype.stopPropagation=function(){this.cb=!0};pi.prototype.preventDefault=function(){this.defaultPrevented=!0;this.Gc=!1};function qi(a){qi[" "](a);return a}qi[" "]=da;function ri(a,b){pi.call(this,a?a.type:"");this.relatedTarget=this.currentTarget=this.target=null;this.charCode=this.keyCode=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.Cb=this.state=null;if(a){var c=this.type=a.type;this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;if(d){if(cb){var e;a:{try{qi(d.nodeName);e=!0;break a}catch(f){}e=!1}e||(d=null)}}else"mouseover"==
c?d=a.fromElement:"mouseout"==c&&(d=a.toElement);this.relatedTarget=d;this.offsetX=db||void 0!==a.offsetX?a.offsetX:a.layerX;this.offsetY=db||void 0!==a.offsetY?a.offsetY:a.layerY;this.clientX=void 0!==a.clientX?a.clientX:a.pageX;this.clientY=void 0!==a.clientY?a.clientY:a.pageY;this.screenX=a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;
this.metaKey=a.metaKey;this.state=a.state;this.Cb=a;a.defaultPrevented&&this.preventDefault()}}ua(ri,pi);ri.prototype.stopPropagation=function(){ri.$b.stopPropagation.call(this);this.Cb.stopPropagation?this.Cb.stopPropagation():this.Cb.cancelBubble=!0};ri.prototype.preventDefault=function(){ri.$b.preventDefault.call(this);var a=this.Cb;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,oi)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var si="closure_listenable_"+(1E6*Math.random()|0),ti=0;function ui(a,b,c,d,e){this.listener=a;this.Zb=null;this.src=b;this.type=c;this.pb=!!d;this.Ub=e;this.key=++ti;this.mb=this.Nb=!1}function vi(a){a.mb=!0;a.listener=null;a.Zb=null;a.src=null;a.Ub=null};function wi(a){this.src=a;this.va={};this.Lb=0}wi.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.va[f];a||(a=this.va[f]=[],this.Lb++);var g=xi(a,b,d,e);-1<g?(b=a[g],c||(b.Nb=!1)):(b=new ui(b,this.src,f,!!d,e),b.Nb=c,a.push(b));return b};wi.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.va))return!1;var e=this.va[a];b=xi(e,b,c,d);return-1<b?(vi(e[b]),Ga.splice.call(e,b,1),0==e.length&&(delete this.va[a],this.Lb--),!0):!1};
function yi(a,b){var c=b.type;c in a.va&&Na(a.va[c],b)&&(vi(b),0==a.va[c].length&&(delete a.va[c],a.Lb--))}wi.prototype.nc=function(a,b,c,d){a=this.va[a.toString()];var e=-1;a&&(e=xi(a,b,c,d));return-1<e?a[e]:null};wi.prototype.hasListener=function(a,b){var c=void 0!==a,d=c?a.toString():"",e=void 0!==b;return Ta(this.va,function(a){for(var g=0;g<a.length;++g)if(!(c&&a[g].type!=d||e&&a[g].pb!=b))return!0;return!1})};
function xi(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.mb&&f.listener==b&&f.pb==!!c&&f.Ub==d)return e}return-1};var zi="closure_lm_"+(1E6*Math.random()|0),Ai={},Bi=0;
function Ci(a,b,c,d,e){if("array"==u(b))for(var f=0;f<b.length;f++)Ci(a,b[f],c,d,e);else if(c=Di(c),a&&a[si])a.Da.add(String(b),c,!1,d,e);else{if(!b)throw Error("Invalid event type");var f=!!d,g=Ei(a);g||(a[zi]=g=new wi(a));c=g.add(b,c,!1,d,e);if(!c.Zb){d=Fi();c.Zb=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,f);else if(a.attachEvent)a.attachEvent(Gi(b.toString()),d);else throw Error("addEventListener and attachEvent are unavailable.");Bi++}}}
function Fi(){var a=Hi,b=ni?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b}function Ii(a,b,c,d,e){if("array"==u(b))for(var f=0;f<b.length;f++)Ii(a,b[f],c,d,e);else c=Di(c),a&&a[si]?a.Da.remove(String(b),c,d,e):a&&(a=Ei(a))&&(b=a.nc(b,c,!!d,e))&&Ji(b)}
function Ji(a){if("number"!=typeof a&&a&&!a.mb){var b=a.src;if(b&&b[si])yi(b.Da,a);else{var c=a.type,d=a.Zb;b.removeEventListener?b.removeEventListener(c,d,a.pb):b.detachEvent&&b.detachEvent(Gi(c),d);Bi--;(c=Ei(b))?(yi(c,a),0==c.Lb&&(c.src=null,b[zi]=null)):vi(a)}}}function Gi(a){return a in Ai?Ai[a]:Ai[a]="on"+a}function Ki(a,b,c,d){var e=!0;if(a=Ei(a))if(b=a.va[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.pb==c&&!f.mb&&(f=Li(f,d),e=e&&!1!==f)}return e}
function Li(a,b){var c=a.listener,d=a.Ub||a.src;a.Nb&&Ji(a);return c.call(d,b)}
function Hi(a,b){if(a.mb)return!0;if(!ni){var c;if(!(c=b))a:{c=["window","event"];for(var d=ca,e;e=c.shift();)if(null!=d[e])d=d[e];else{c=null;break a}c=d}e=c;c=new ri(e,this);d=!0;if(!(0>e.keyCode||void 0!=e.returnValue)){a:{var f=!1;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(l){f=!0}if(f||void 0==e.returnValue)e.returnValue=!0}e=[];for(f=c.currentTarget;f;f=f.parentNode)e.push(f);for(var f=a.type,g=e.length-1;!c.cb&&0<=g;g--){c.currentTarget=e[g];var k=Ki(e[g],f,!0,c),d=d&&k}for(g=0;!c.cb&&
g<e.length;g++)c.currentTarget=e[g],k=Ki(e[g],f,!1,c),d=d&&k}return d}return Li(a,new ri(b,this))}function Ei(a){a=a[zi];return a instanceof wi?a:null}var Mi="__closure_events_fn_"+(1E9*Math.random()>>>0);function Di(a){if(ha(a))return a;a[Mi]||(a[Mi]=function(b){return a.handleEvent(b)});return a[Mi]};function Ni(){ki.call(this);this.Da=new wi(this);this.Lc=this;this.pc=null}ua(Ni,ki);Ni.prototype[si]=!0;h=Ni.prototype;h.addEventListener=function(a,b,c,d){Ci(this,a,b,c,d)};h.removeEventListener=function(a,b,c,d){Ii(this,a,b,c,d)};
h.dispatchEvent=function(a){var b,c=this.pc;if(c)for(b=[];c;c=c.pc)b.push(c);var c=this.Lc,d=a.type||a;if(ga(a))a=new pi(a,c);else if(a instanceof pi)a.target=a.target||c;else{var e=a;a=new pi(d,c);Ya(a,e)}var e=!0,f;if(b)for(var g=b.length-1;!a.cb&&0<=g;g--)f=a.currentTarget=b[g],e=Oi(f,d,!0,a)&&e;a.cb||(f=a.currentTarget=c,e=Oi(f,d,!0,a)&&e,a.cb||(e=Oi(f,d,!1,a)&&e));if(b)for(g=0;!a.cb&&g<b.length;g++)f=a.currentTarget=b[g],e=Oi(f,d,!1,a)&&e;return e};
h.Ab=function(){Ni.$b.Ab.call(this);if(this.Da){var a=this.Da,b=0,c;for(c in a.va){for(var d=a.va[c],e=0;e<d.length;e++)++b,vi(d[e]);delete a.va[c];a.Lb--}}this.pc=null};function Oi(a,b,c,d){b=a.Da.va[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var g=b[f];if(g&&!g.mb&&g.pb==c){var k=g.listener,l=g.Ub||g.src;g.Nb&&yi(a.Da,g);e=!1!==k.call(l,d)&&e}}return e&&0!=d.Gc}h.nc=function(a,b,c,d){return this.Da.nc(String(a),b,c,d)};
h.hasListener=function(a,b){return this.Da.hasListener(void 0!==a?String(a):void 0,b)};function Pi(a,b,c){if(ha(a))c&&(a=ra(a,c));else if(a&&"function"==typeof a.handleEvent)a=ra(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<b?-1:ca.setTimeout(a,b||0)};function Qi(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};function Ri(a){if("function"==typeof a.Tb)return a.Tb();if(ga(a))return a.split("");if(fa(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return Ua(a)}
function Si(a,b){if("function"==typeof a.forEach)a.forEach(b,void 0);else if(fa(a)||ga(a))Ja(a,b,void 0);else{var c;if("function"==typeof a.Db)c=a.Db();else if("function"!=typeof a.Tb)if(fa(a)||ga(a)){c=[];for(var d=a.length,e=0;e<d;e++)c.push(e)}else c=Va(a);else c=void 0;for(var d=Ri(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a)}};function Ti(a,b){this.Oa={};this.ta=[];this.Na=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)}h=Ti.prototype;h.Tb=function(){Ui(this);for(var a=[],b=0;b<this.ta.length;b++)a.push(this.Oa[this.ta[b]]);return a};h.Db=function(){Ui(this);return this.ta.concat()};
h.equals=function(a,b){if(this===a)return!0;if(this.Na!=a.Na)return!1;var c=b||Vi;Ui(this);for(var d,e=0;d=this.ta[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};function Vi(a,b){return a===b}h.isEmpty=function(){return 0==this.Na};h.clear=function(){this.Oa={};this.Na=this.ta.length=0};h.remove=function(a){return Object.prototype.hasOwnProperty.call(this.Oa,a)?(delete this.Oa[a],this.Na--,this.ta.length>2*this.Na&&Ui(this),!0):!1};
function Ui(a){if(a.Na!=a.ta.length){for(var b=0,c=0;b<a.ta.length;){var d=a.ta[b];Object.prototype.hasOwnProperty.call(a.Oa,d)&&(a.ta[c++]=d);b++}a.ta.length=c}if(a.Na!=a.ta.length){for(var e={},c=b=0;b<a.ta.length;)d=a.ta[b],Object.prototype.hasOwnProperty.call(e,d)||(a.ta[c++]=d,e[d]=1),b++;a.ta.length=c}}h.get=function(a,b){return Object.prototype.hasOwnProperty.call(this.Oa,a)?this.Oa[a]:b};
h.set=function(a,b){Object.prototype.hasOwnProperty.call(this.Oa,a)||(this.Na++,this.ta.push(a));this.Oa[a]=b};h.addAll=function(a){var b;a instanceof Ti?(b=a.Db(),a=a.Tb()):(b=Va(a),a=Ua(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};h.forEach=function(a,b){for(var c=this.Db(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};h.clone=function(){return new Ti(this)};function Wi(a,b,c,d,e){this.reset(a,b,c,d,e)}Wi.prototype.zc=null;var Xi=0;Wi.prototype.reset=function(a,b,c,d,e){"number"==typeof e||Xi++;d||sa();this.Hb=a;this.jd=b;delete this.zc};Wi.prototype.Ic=function(a){this.Hb=a};function Yi(a){this.Dc=a;this.Ac=this.gc=this.Hb=this.Yb=null}function Zi(a,b){this.name=a;this.value=b}Zi.prototype.toString=function(){return this.name};var $i=new Zi("SEVERE",1E3),aj=new Zi("INFO",800),bj=new Zi("CONFIG",700),cj=new Zi("FINE",500);h=Yi.prototype;h.getName=function(){return this.Dc};h.getParent=function(){return this.Yb};h.Ic=function(a){this.Hb=a};function dj(a){if(a.Hb)return a.Hb;if(a.Yb)return dj(a.Yb);Fa("Root logger has no level set.");return null}
h.log=function(a,b,c){if(a.value>=dj(this).value)for(ha(b)&&(b=b()),a=new Wi(a,String(b),this.Dc),c&&(a.zc=c),c="log:"+a.jd,ca.console&&(ca.console.timeStamp?ca.console.timeStamp(c):ca.console.markTimeline&&ca.console.markTimeline(c)),ca.msWriteProfilerMark&&ca.msWriteProfilerMark(c),c=this;c;){b=c;var d=a;if(b.Ac)for(var e=0,f=void 0;f=b.Ac[e];e++)f(d);c=c.getParent()}};h.info=function(a,b){this.log(aj,a,b)};var ej={},fj=null;
function gj(a){fj||(fj=new Yi(""),ej[""]=fj,fj.Ic(bj));var b;if(!(b=ej[a])){b=new Yi(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=gj(a.substr(0,c));c.gc||(c.gc={});c.gc[d]=b;b.Yb=c;ej[a]=b}return b};function hj(a,b){a&&a.log(cj,b,void 0)};function ij(){}ij.prototype.rc=null;function jj(a){var b;(b=a.rc)||(b={},kj(a)&&(b[0]=!0,b[1]=!0),b=a.rc=b);return b};var lj;function mj(){}ua(mj,ij);function nj(a){return(a=kj(a))?new ActiveXObject(a):new XMLHttpRequest}function kj(a){if(!a.Bc&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.Bc=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.Bc}lj=new mj;var oj=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function pj(a){if(qj){qj=!1;var b=ca.location;if(b){var c=b.href;if(c&&(c=(c=pj(c)[3]||null)?decodeURI(c):c)&&c!=b.hostname)throw qj=!0,Error();}}return a.match(oj)}var qj=db;function rj(a){Ni.call(this);this.headers=new Ti;this.dc=a||null;this.Qa=!1;this.cc=this.H=null;this.Gb=this.Cc=this.Wb="";this.ab=this.oc=this.Vb=this.mc=!1;this.Kb=0;this.ac=null;this.Fc=sj;this.bc=this.qd=!1}ua(rj,Ni);var sj="",tj=rj.prototype,uj=gj("goog.net.XhrIo");tj.Ga=uj;var vj=/^https?$/i,wj=["POST","PUT"],xj=[];h=rj.prototype;h.Mc=function(){if(!this.Bb&&(this.Bb=!0,this.Ab(),0!=li)){var a=ia(this);delete mi[a]}Na(xj,this)};
h.send=function(a,b,c,d){if(this.H)throw Error("[goog.net.XhrIo] Object is active with another request\x3d"+this.Wb+"; newUri\x3d"+a);b=b?b.toUpperCase():"GET";this.Wb=a;this.Gb="";this.Cc=b;this.mc=!1;this.Qa=!0;this.H=this.dc?nj(this.dc):nj(lj);this.cc=this.dc?jj(this.dc):jj(lj);this.H.onreadystatechange=ra(this.Ec,this);try{hj(this.Ga,yj(this,"Opening Xhr")),this.oc=!0,this.H.open(b,String(a),!0),this.oc=!1}catch(f){hj(this.Ga,yj(this,"Error opening Xhr: "+f.message));zj(this,f);return}a=c||"";
var e=this.headers.clone();d&&Si(d,function(a,b){e.set(b,a)});d=Ka(e.Db());c=ca.FormData&&a instanceof ca.FormData;!(0<=Ha(wj,b))||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset\x3dutf-8");e.forEach(function(a,b){this.H.setRequestHeader(b,a)},this);this.Fc&&(this.H.responseType=this.Fc);"withCredentials"in this.H&&(this.H.withCredentials=this.qd);try{Aj(this),0<this.Kb&&(this.bc=Bj(this.H),hj(this.Ga,yj(this,"Will abort after "+this.Kb+"ms if incomplete, xhr2 "+this.bc)),this.bc?
(this.H.timeout=this.Kb,this.H.ontimeout=ra(this.Jc,this)):this.ac=Pi(this.Jc,this.Kb,this)),hj(this.Ga,yj(this,"Sending request")),this.Vb=!0,this.H.send(a),this.Vb=!1}catch(f){hj(this.Ga,yj(this,"Send error: "+f.message)),zj(this,f)}};function Bj(a){return ab&&jb(9)&&"number"==typeof a.timeout&&void 0!==a.ontimeout}function La(a){return"content-type"==a.toLowerCase()}
h.Jc=function(){"undefined"!=typeof aa&&this.H&&(this.Gb="Timed out after "+this.Kb+"ms, aborting",hj(this.Ga,yj(this,this.Gb)),this.dispatchEvent("timeout"),this.abort(8))};function zj(a,b){a.Qa=!1;a.H&&(a.ab=!0,a.H.abort(),a.ab=!1);a.Gb=b;Cj(a);Dj(a)}function Cj(a){a.mc||(a.mc=!0,a.dispatchEvent("complete"),a.dispatchEvent("error"))}
h.abort=function(){this.H&&this.Qa&&(hj(this.Ga,yj(this,"Aborting")),this.Qa=!1,this.ab=!0,this.H.abort(),this.ab=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Dj(this))};h.Ab=function(){this.H&&(this.Qa&&(this.Qa=!1,this.ab=!0,this.H.abort(),this.ab=!1),Dj(this,!0));rj.$b.Ab.call(this)};h.Ec=function(){this.Bb||(this.oc||this.Vb||this.ab?Ej(this):this.ld())};h.ld=function(){Ej(this)};
function Ej(a){if(a.Qa&&"undefined"!=typeof aa)if(a.cc[1]&&4==Fj(a)&&2==a.getStatus())hj(a.Ga,yj(a,"Local request error detected and ignored"));else if(a.Vb&&4==Fj(a))Pi(a.Ec,0,a);else if(a.dispatchEvent("readystatechange"),4==Fj(a)){hj(a.Ga,yj(a,"Request complete"));a.Qa=!1;try{var b=a.getStatus(),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=!0;break a;default:c=!1}var d;if(!(d=c)){var e;if(e=0===b){var f=pj(String(a.Wb))[1]||null;if(!f&&ca.self&&ca.self.location)var g=
ca.self.location.protocol,f=g.substr(0,g.length-1);e=!vj.test(f?f.toLowerCase():"")}d=e}if(d)a.dispatchEvent("complete"),a.dispatchEvent("success");else{var k;try{k=2<Fj(a)?a.H.statusText:""}catch(l){hj(a.Ga,"Can not get status: "+l.message),k=""}a.Gb=k+" ["+a.getStatus()+"]";Cj(a)}}finally{Dj(a)}}}
function Dj(a,b){if(a.H){Aj(a);var c=a.H,d=a.cc[0]?da:null;a.H=null;a.cc=null;b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(e){(c=a.Ga)&&c.log($i,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}}function Aj(a){a.H&&a.bc&&(a.H.ontimeout=null);"number"==typeof a.ac&&(ca.clearTimeout(a.ac),a.ac=null)}function Fj(a){return a.H?a.H.readyState:0}h.getStatus=function(){try{return 2<Fj(this)?this.H.status:-1}catch(a){return-1}};
function Gj(a){if(a.H)return Qi(a.H.responseText)}h.getResponseHeader=function(a){return this.H&&4==Fj(this)?this.H.getResponseHeader(a):void 0};h.getAllResponseHeaders=function(){return this.H&&4==Fj(this)?this.H.getAllResponseHeaders():""};function yj(a,b){return b+" ["+a.Cc+" "+a.Wb+" "+a.getStatus()+"]"};var Y,Hj=new y(null,7,[ch,null,hh,null,Eh,new y(null,2,[Hh,!0,gh,"#8E44AD"],null),sh,null,dh,"2015-05-01",ih,moment().format("YYYY-MM-DD"),th,new y(null,5,[uh,new y(null,2,[gh,"#ff0000",Hh,!0],null),Lh,new y(null,2,[gh,"#ffdd00",Hh,!0],null),Jh,new y(null,2,[gh,"#0000ff",Hh,!0],null),Bh,new y(null,2,[gh,"#00ff00",Hh,!0],null),qh,new y(null,2,[gh,"#000000",Hh,!0],null)],null)],null);Y=V.a?V.a(Hj):V.call(null,Hj);
function Ij(a,b,c){var d=O(c,0);c=O(c,1);var e=new rj;xj.push(e);b&&e.Da.add("complete",b,!1,void 0,void 0);e.Da.add("ready",e.Mc,!0,void 0,void 0);e.send(a,"POST",d,c);return e}var Jj=document.getElementById("base-url").getAttribute("value");function Kj(a,b){return hf(function(a){return null!=a.point?a.point.setMap(b):null},a)}
function Lj(a){hf(function(b){var c=jf(function(a){return Xc.b(a.status,se(Zb(b)))},ch.a(L.a?L.a(a):L.call(null,a))),d=Hh.a($b(b));return z(d)?Kj(c,sh.a(L.a?L.a(a):L.call(null,a))):Kj(c,null)},th.a(L.a?L.a(a):L.call(null,a)))}function Mj(a){var b=Date.parse(ih.a(L.a?L.a(a):L.call(null,a)))+864E5;a=jf(function(a){return function(b){return b.timestamp_created>=a}}(b),ch.a(L.a?L.a(a):L.call(null,a)));return Kj(a,null)}function Nj(a){Lj(a);return Mj(a)}
function Oj(a,b,c){return Pj(a,b,c,function(){return kd})}function Pj(a,b,c,d){b=new google.maps.Circle({strokeColor:c,strokeOpacity:1,strokeWeight:2,fillColor:c,fillOpacity:1,map:b,center:{lat:a.lat,lng:a.lng},radius:20});b.addListener("click",d);return a.point=b}function Qj(a){var b=[F(Jj),F("couriers")].join(""),c=Ng(new y(null,1,["Content-Type","application/json"],null));return Ij(b,a,gd([Re,c],0))}function Rj(a,b){return J(ff(function(a){return Xc.b(b,a.id)},a))}
function Sj(){Qj(function(a){a=a.target;var b=Gj(a),c=b.couriers;cf.m(Y,Sd,hh,c);return hf(function(){return function(a){return Oj(a,sh.a(L.a?L.a(Y):L.call(null,Y)),kf(L.a?L.a(Y):L.call(null,Y),new P(null,2,5,U,[Eh,gh],null)))}}(a,b,c),hh.a(L.a?L.a(Y):L.call(null,Y)))})}
function Tj(){return Qj(function(a){a=a.target;var b=Gj(a),c=b.couriers;return hf(function(){return function(a){var b=Rj(hh.a(L.a?L.a(Y):L.call(null,Y)),a.id),c=b.point,g=a.lat;a=a.lng;var k=Ng(new y(null,2,[zh,g,Ih,a],null));b.lat=g;b.lng=a;c.setCenter(k);return c.setRadius(50)}}(a,b,c),c)})}
function Uj(a,b){var c=[F(Jj),F("orders-since-date")].join(""),d=function(){var a=Ng(new y(null,1,[eh,b],null));return JSON.stringify(a)}(),e=Ng(new y(null,1,["Content-Type","application/json"],null));return Ij(c,function(b,c,d){return function(e){e=e.target;var m=Gj(e),n=m.orders;Kj(ch.a(L.a?L.a(a):L.call(null,a)),null);cf.m(a,Sd,ch,n);hf(function(){return function(b){return Oj(b,sh.a(L.a?L.a(a):L.call(null,a)),kf(L.a?L.a(a):L.call(null,a),new P(null,3,5,U,[th,Be.a(b.status),gh],null)))}}(e,m,n,
b,c,d),ch.a(L.a?L.a(a):L.call(null,a)));hf(function(){return function(a){return a.timestamp_created=Date.parse(a.timestamp_created)}}(e,m,n,b,c,d),ch.a(L.a?L.a(a):L.call(null,a)));return Nj(a)}}(c,d,e),gd([d,e],0))}
function Vj(a){return ji(gd([new P(null,2,5,U,[rh,new y(null,1,[ph,[F("height: 10px;"),F(" width: 10px;"),F(" display: inline-block;"),F(" float: right;"),F(" border-radius: 10px;"),F(" margin-top: 7px;"),F(" margin-left: 5px;"),F(" background-color: "),F(a)].join("")],null)],null)],0))}
function Wj(a){var b=ji(gd([new P(null,2,5,U,[Ch,new y(null,5,[nh,"checkbox",kh,"orders",lh,"orders",xh,"orders-checkbox",yh,!0],null)],null)],0)),c=ji(gd([new P(null,5,5,U,[rh,new y(null,1,[xh,"setCenterText"],null),b,a,Vj(kf(L.a?L.a(Y):L.call(null,Y),new P(null,3,5,U,[th,Be.a(a),gh],null)))],null)],0));b.addEventListener("click",function(b){return function(){z(b.checked)?cf.m(Y,lf,new P(null,3,5,U,[th,Be.a(a),Hh],null),!0):cf.m(Y,lf,new P(null,3,5,U,[th,Be.a(a),Hh],null),!1);return Nj(Y)}}(b,c));
return c}function Xj(){return ji(gd([new P(null,2,5,U,[rh,new P(null,3,5,U,[rh,new y(null,2,[xh,"setCenterUI",oh,"Select order status"],null),re.b(function(a){return Wj(a)},Vc("unassigned","enroute","servicing","complete","cancelled"))],null)],null)],0))}
function Yj(){function a(a){return ji(gd([new P(null,2,5,U,[Ch,new y(null,4,[nh,"text",kh,"orders-date",xh,"date-picker",lh,a],null)],null)],0))}var b=function(){return function(a,b){return new Pikaday({field:a,format:"YYYY-MM-DD",onSelect:b})}}(a),c=a(dh.a(L.a?L.a(Y):L.call(null,Y))),d=b(c,function(a,b,c){return function(){return Uj(Y,c.value)}}(a,b,c)),e=a(ih.a(L.a?L.a(Y):L.call(null,Y)));b(e,function(a,b,c,d,e){return function(){cf.m(Y,Sd,ih,e.value);return Nj(Y)}}(a,b,c,d,e));return ji(gd([new P(null,
2,5,U,[rh,new P(null,3,5,U,[rh,new y(null,2,[xh,"setCenterUI",oh,"Click to change dates"],null),new P(null,9,5,U,[rh,new y(null,1,[xh,"setCenterText"],null),"Orders",new P(null,1,5,U,[Ah],null),"From: ",c,new P(null,1,5,U,[Ah],null),"To:   ",e],null)],null)],null)],0))}
function Zj(){var a=ji(gd([new P(null,2,5,U,[Ch,new y(null,5,[nh,"checkbox",kh,"couriers",lh,"couriers",xh,"couriers-checkbox",yh,!0],null)],null)],0)),b=ji(gd([new P(null,5,5,U,[rh,new y(null,1,[xh,"setCenterText"],null),a,"Couriers",Vj(kf(L.a?L.a(Y):L.call(null,Y),new P(null,2,5,U,[Eh,gh],null)))],null)],0));a.addEventListener("click",function(a){return function(){return z(a.checked)?Kj(hh.a(L.a?L.a(Y):L.call(null,Y)),sh.a(L.a?L.a(Y):L.call(null,Y))):Kj(hh.a(L.a?L.a(Y):L.call(null,Y)),null)}}(a,
b));return ji(gd([new P(null,2,5,U,[rh,new P(null,3,5,U,[rh,new y(null,2,[xh,"setCenterUI",oh,"Select couriers"],null),b],null)],null)],0))}function ak(a,b){a.controls[google.maps.ControlPosition.LEFT_TOP].push(b)}var bk=function bk(b){return setTimeout(function(){b.w?b.w():b.call(null);return bk(b)},1E3)};
function ck(){cf.m(Y,Sd,sh,new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:16}));ak(sh.a(L.a?L.a(Y):L.call(null,Y)),ji(gd([new P(null,3,5,U,[rh,Yj(),Xj()],null)],0)));ak(sh.a(L.a?L.a(Y):L.call(null,Y)),ji(gd([new P(null,2,5,U,[rh,Zj()],null)],0)));Uj(Y,dh.a(L.a?L.a(Y):L.call(null,Y)));Sj();return bk(function(){return Tj()})}var dk=["dashboard_cljs","core","init_map"],ek=ca;dk[0]in ek||!ek.execScript||ek.execScript("var "+dk[0]);
for(var fk;dk.length&&(fk=dk.shift());)dk.length||void 0===ck?ek=ek[fk]?ek[fk]:ek[fk]={}:ek[fk]=ck;