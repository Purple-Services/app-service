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

var g,aa=aa||{},t=this;function ba(a){return void 0!==a}function da(){}
function y(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function ea(a){var b=y(a);return"array"==b||"object"==b&&"number"==typeof a.length}function fa(a){return"string"==typeof a}function ga(a){return"function"==y(a)}function ia(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}function ja(a){return a[la]||(a[la]=++ma)}var la="closure_uid_"+(1E9*Math.random()>>>0),ma=0;function oa(a,b,c){return a.call.apply(a.bind,arguments)}
function pa(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function sa(a,b,c){sa=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?oa:pa;return sa.apply(null,arguments)}var ta=Date.now||function(){return+new Date};
function ua(a,b){function c(){}c.prototype=b.prototype;a.dc=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.ic=function(a,c,f){for(var h=Array(arguments.length-2),k=2;k<arguments.length;k++)h[k-2]=arguments[k];return b.prototype[c].apply(a,h)}};function wa(a){if(Error.captureStackTrace)Error.captureStackTrace(this,wa);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}ua(wa,Error);wa.prototype.name="CustomError";var xa;function za(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")}var Aa=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function Ba(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")}function Ca(a,b){return a<b?-1:a>b?1:0}
function Ea(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})}function Fa(a){var b=fa(void 0)?Ba(void 0):"\\s";return a.replace(new RegExp("(^"+(b?"|["+b+"]+":"")+")([a-z])","g"),function(a,b,e){return b+e.toUpperCase()})};function Ga(a,b){b.unshift(a);wa.call(this,za.apply(null,b));b.shift()}ua(Ga,wa);Ga.prototype.name="AssertionError";function Ha(a,b){throw new Ga("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};var Ia=Array.prototype,Ja=Ia.indexOf?function(a,b,c){return Ia.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(fa(a))return fa(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},La=Ia.forEach?function(a,b,c){Ia.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=fa(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},Ma=Ia.filter?function(a,b,c){return Ia.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],
f=0,h=fa(a)?a.split(""):a,k=0;k<d;k++)if(k in h){var l=h[k];b.call(c,l,k,a)&&(e[f++]=l)}return e},Na=Ia.some?function(a,b,c){return Ia.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=fa(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1};function Oa(a){var b;a:{b=Pa;for(var c=a.length,d=fa(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:fa(a)?a.charAt(b):a[b]}
function Qa(a,b){var c=Ja(a,b),d;(d=0<=c)&&Ia.splice.call(a,c,1);return d}function Ra(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]}function Sa(a,b){return a>b?1:a<b?-1:0};var Ta;a:{var Va=t.navigator;if(Va){var Wa=Va.userAgent;if(Wa){Ta=Wa;break a}}Ta=""}function Xa(a){return-1!=Ta.indexOf(a)};function Ya(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function Za(a,b){for(var c in a)if(b.call(void 0,a[c],c,a))return!0;return!1}function $a(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function ab(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}var bb="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function cb(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<bb.length;f++)c=bb[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}}function eb(a){var b=arguments.length;if(1==b&&"array"==y(arguments[0]))return eb.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};function fb(){return Xa("Opera")||Xa("OPR")}function gb(){return(Xa("Chrome")||Xa("CriOS"))&&!fb()&&!Xa("Edge")};var hb=fb(),ib=Xa("Trident")||Xa("MSIE"),jb=Xa("Edge"),kb=Xa("Gecko")&&!(-1!=Ta.toLowerCase().indexOf("webkit")&&!Xa("Edge"))&&!(Xa("Trident")||Xa("MSIE"))&&!Xa("Edge"),lb=-1!=Ta.toLowerCase().indexOf("webkit")&&!Xa("Edge");function mb(){var a=Ta;if(kb)return/rv\:([^\);]+)(\)|;)/.exec(a);if(jb)return/Edge\/([\d\.]+)/.exec(a);if(ib)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(lb)return/WebKit\/(\S+)/.exec(a)}function nb(){var a=t.document;return a?a.documentMode:void 0}
var ob=function(){if(hb&&t.opera){var a=t.opera.version;return ga(a)?a():a}var a="",b=mb();b&&(a=b?b[1]:"");return ib&&(b=nb(),b>parseFloat(a))?String(b):a}(),pb={};
function rb(a){var b;if(!(b=pb[a])){b=0;for(var c=Aa(String(ob)).split("."),d=Aa(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var h=c[f]||"",k=d[f]||"",l=RegExp("(\\d*)(\\D*)","g"),m=RegExp("(\\d*)(\\D*)","g");do{var n=l.exec(h)||["","",""],p=m.exec(k)||["","",""];if(0==n[0].length&&0==p[0].length)break;b=Ca(0==n[1].length?0:parseInt(n[1],10),0==p[1].length?0:parseInt(p[1],10))||Ca(0==n[2].length,0==p[2].length)||Ca(n[2],p[2])}while(0==b)}b=pb[a]=0<=b}return b}
var sb=t.document,tb=sb&&ib?nb()||("CSS1Compat"==sb.compatMode?parseInt(ob,10):5):void 0;var ub=!kb&&!ib||ib&&9<=tb||kb&&rb("1.9.1");ib&&rb("9");eb("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));function vb(a,b,c){function d(c){c&&b.appendChild(fa(c)?a.createTextNode(c):c)}for(var e=1;e<c.length;e++){var f=c[e];!ea(f)||ia(f)&&0<f.nodeType?d(f):La(wb(f)?Ra(f):f,d)}}function xb(a){return a&&a.parentNode?a.parentNode.removeChild(a):null}function wb(a){if(a&&"number"==typeof a.length){if(ia(a))return"function"==typeof a.item||"string"==typeof a.item;if(ga(a))return"function"==typeof a.item}return!1}function yb(a){this.Uc=a||t.document||document}g=yb.prototype;g.createElement=function(a){return this.Uc.createElement(a)};
g.createTextNode=function(a){return this.Uc.createTextNode(String(a))};g.ab=function(){var a=this.Uc;return a.parentWindow||a.defaultView};g.appendChild=function(a,b){a.appendChild(b)};g.append=function(a,b){vb(9==a.nodeType?a:a.ownerDocument||a.document,a,arguments)};g.canHaveChildren=function(a){if(1!=a.nodeType)return!1;switch(a.tagName){case "APPLET":case "AREA":case "BASE":case "BR":case "COL":case "COMMAND":case "EMBED":case "FRAME":case "HR":case "IMG":case "INPUT":case "IFRAME":case "ISINDEX":case "KEYGEN":case "LINK":case "NOFRAMES":case "NOSCRIPT":case "META":case "OBJECT":case "PARAM":case "SCRIPT":case "SOURCE":case "STYLE":case "TRACK":case "WBR":return!1}return!0};
g.removeNode=xb;g.Cd=function(a){return ub&&void 0!=a.children?a.children:Ma(a.childNodes,function(a){return 1==a.nodeType})};g.contains=function(a,b){if(a.contains&&1==b.nodeType)return a==b||a.contains(b);if("undefined"!=typeof a.compareDocumentPosition)return a==b||Boolean(a.compareDocumentPosition(b)&16);for(;b&&a!=b;)b=b.parentNode;return b==a};function zb(a,b){null!=a&&this.append.apply(this,arguments)}g=zb.prototype;g.Ya="";g.set=function(a){this.Ya=""+a};g.append=function(a,b,c){this.Ya+=a;if(null!=b)for(var d=1;d<arguments.length;d++)this.Ya+=arguments[d];return this};g.clear=function(){this.Ya=""};g.getLength=function(){return this.Ya.length};g.toString=function(){return this.Ya};var Ab={},Bb;if("undefined"===typeof Cb)var Cb=function(){throw Error("No *print-fn* fn set for evaluation environment");};if("undefined"===typeof Db)var Db=function(){throw Error("No *print-err-fn* fn set for evaluation environment");};var Eb=null;if("undefined"===typeof Fb)var Fb=null;function Gb(){return new Hb(null,5,[Ib,!0,Kb,!0,Lb,!1,Mb,!1,Nb,null],null)}Ob;function A(a){return null!=a&&!1!==a}Pb;B;function Qb(a){return a instanceof Array}function Rb(a){return null==a?!0:!1===a?!0:!1}
function C(a,b){return a[y(null==b?null:b)]?!0:a._?!0:!1}function Sb(a){return null==a?null:a.constructor}function D(a,b){var c=Sb(b),c=A(A(c)?c.sd:c)?c.oc:y(b);return Error(["No protocol method ",a," defined for type ",c,": ",b].join(""))}function Tb(a){var b=a.oc;return A(b)?b:""+F(a)}var Ub="undefined"!==typeof Symbol&&"function"===y(Symbol)?Symbol.iterator:"@@iterator";function Vb(a){for(var b=a.length,c=Array(b),d=0;;)if(d<b)c[d]=a[d],d+=1;else break;return c}Wb;Xb;
var Ob=function Ob(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Ob.a(arguments[0]);case 2:return Ob.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Ob.a=function(a){return Ob.b(null,a)};Ob.b=function(a,b){function c(a,b){a.push(b);return a}var d=[];return Xb.c?Xb.c(c,d,b):Xb.call(null,c,d,b)};Ob.A=2;function Yb(){}
var Zb=function Zb(b){if(null!=b&&null!=b.Y)return b.Y(b);var c=Zb[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Zb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ICounted.-count",b);},$b=function $b(b){if(null!=b&&null!=b.X)return b.X(b);var c=$b[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=$b._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEmptyableCollection.-empty",b);};function ac(){}
var bc=function bc(b,c){if(null!=b&&null!=b.V)return b.V(b,c);var d=bc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=bc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ICollection.-conj",b);};function ec(){}
var G=function G(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return G.b(arguments[0],arguments[1]);case 3:return G.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
G.b=function(a,b){if(null!=a&&null!=a.O)return a.O(a,b);var c=G[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=G._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IIndexed.-nth",a);};G.c=function(a,b,c){if(null!=a&&null!=a.Aa)return a.Aa(a,b,c);var d=G[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=G._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IIndexed.-nth",a);};G.A=3;function fc(){}
var gc=function gc(b){if(null!=b&&null!=b.ca)return b.ca(b);var c=gc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=gc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-first",b);},hc=function hc(b){if(null!=b&&null!=b.va)return b.va(b);var c=hc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-rest",b);};function ic(){}function jc(){}
var kc=function kc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return kc.b(arguments[0],arguments[1]);case 3:return kc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
kc.b=function(a,b){if(null!=a&&null!=a.L)return a.L(a,b);var c=kc[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=kc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ILookup.-lookup",a);};kc.c=function(a,b,c){if(null!=a&&null!=a.G)return a.G(a,b,c);var d=kc[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=kc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ILookup.-lookup",a);};kc.A=3;
var lc=function lc(b,c){if(null!=b&&null!=b.Oc)return b.Oc(b,c);var d=lc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=lc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IAssociative.-contains-key?",b);},mc=function mc(b,c,d){if(null!=b&&null!=b.fb)return b.fb(b,c,d);var e=mc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=mc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IAssociative.-assoc",b);};function nc(){}
function oc(){}var pc=function pc(b){if(null!=b&&null!=b.Ob)return b.Ob(b);var c=pc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=pc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-key",b);},qc=function qc(b){if(null!=b&&null!=b.Pb)return b.Pb(b);var c=qc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=qc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-val",b);};function rc(){}
var sc=function sc(b){if(null!=b&&null!=b.hb)return b.hb(b);var c=sc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=sc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-peek",b);},tc=function tc(b){if(null!=b&&null!=b.ib)return b.ib(b);var c=tc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=tc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-pop",b);};function uc(){}
var vc=function vc(b,c,d){if(null!=b&&null!=b.jb)return b.jb(b,c,d);var e=vc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=vc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IVector.-assoc-n",b);},wc=function wc(b){if(null!=b&&null!=b.lc)return b.lc(b);var c=wc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=wc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IDeref.-deref",b);};function xc(){}
var yc=function yc(b){if(null!=b&&null!=b.S)return b.S(b);var c=yc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=yc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMeta.-meta",b);},zc=function zc(b,c){if(null!=b&&null!=b.U)return b.U(b,c);var d=zc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=zc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWithMeta.-with-meta",b);};function Ac(){}
var Bc=function Bc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Bc.b(arguments[0],arguments[1]);case 3:return Bc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Bc.b=function(a,b){if(null!=a&&null!=a.aa)return a.aa(a,b);var c=Bc[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Bc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IReduce.-reduce",a);};Bc.c=function(a,b,c){if(null!=a&&null!=a.ba)return a.ba(a,b,c);var d=Bc[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Bc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IReduce.-reduce",a);};Bc.A=3;
var Cc=function Cc(b,c){if(null!=b&&null!=b.v)return b.v(b,c);var d=Cc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Cc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IEquiv.-equiv",b);},Dc=function Dc(b){if(null!=b&&null!=b.P)return b.P(b);var c=Dc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Dc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IHash.-hash",b);};function Ec(){}
var Fc=function Fc(b){if(null!=b&&null!=b.T)return b.T(b);var c=Fc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Fc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeqable.-seq",b);};function Gc(){}function Hc(){}function Ic(){}
var Jc=function Jc(b){if(null!=b&&null!=b.nc)return b.nc(b);var c=Jc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Jc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IReversible.-rseq",b);},Lc=function Lc(b,c){if(null!=b&&null!=b.rd)return b.rd(0,c);var d=Lc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Lc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWriter.-write",b);},Mc=function Mc(b,c,d){if(null!=b&&null!=b.M)return b.M(b,c,d);var e=
Mc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Mc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IPrintWithWriter.-pr-writer",b);},Nc=function Nc(b,c,d){if(null!=b&&null!=b.qd)return b.qd(0,c,d);var e=Nc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Nc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IWatchable.-notify-watches",b);},Oc=function Oc(b){if(null!=b&&null!=b.wb)return b.wb(b);var c=Oc[y(null==b?null:
b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Oc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEditableCollection.-as-transient",b);},Pc=function Pc(b,c){if(null!=b&&null!=b.Tb)return b.Tb(b,c);var d=Pc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Pc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ITransientCollection.-conj!",b);},Qc=function Qc(b){if(null!=b&&null!=b.Ub)return b.Ub(b);var c=Qc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Qc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ITransientCollection.-persistent!",b);},Rc=function Rc(b,c,d){if(null!=b&&null!=b.Sb)return b.Sb(b,c,d);var e=Rc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Rc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientAssociative.-assoc!",b);},Sc=function Sc(b,c,d){if(null!=b&&null!=b.pd)return b.pd(0,c,d);var e=Sc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Sc._;
if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientVector.-assoc-n!",b);};function Tc(){}
var Uc=function Uc(b,c){if(null!=b&&null!=b.vb)return b.vb(b,c);var d=Uc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Uc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IComparable.-compare",b);},Vc=function Vc(b){if(null!=b&&null!=b.md)return b.md();var c=Vc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Vc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunk.-drop-first",b);},Wc=function Wc(b){if(null!=b&&null!=b.Qc)return b.Qc(b);var c=
Wc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Wc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-first",b);},Xc=function Xc(b){if(null!=b&&null!=b.Rc)return b.Rc(b);var c=Xc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Xc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-rest",b);},Yc=function Yc(b){if(null!=b&&null!=b.Pc)return b.Pc(b);var c=Yc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Yc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedNext.-chunked-next",b);},Zc=function Zc(b){if(null!=b&&null!=b.Qb)return b.Qb(b);var c=Zc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Zc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-name",b);},$c=function $c(b){if(null!=b&&null!=b.Rb)return b.Rb(b);var c=$c[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=$c._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-namespace",
b);},ad=function ad(b,c){if(null!=b&&null!=b.le)return b.le(b,c);var d=ad[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=ad._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IReset.-reset!",b);},bd=function bd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return bd.b(arguments[0],arguments[1]);case 3:return bd.c(arguments[0],arguments[1],arguments[2]);case 4:return bd.m(arguments[0],arguments[1],arguments[2],
arguments[3]);case 5:return bd.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};bd.b=function(a,b){if(null!=a&&null!=a.ne)return a.ne(a,b);var c=bd[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=bd._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ISwap.-swap!",a);};
bd.c=function(a,b,c){if(null!=a&&null!=a.oe)return a.oe(a,b,c);var d=bd[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=bd._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ISwap.-swap!",a);};bd.m=function(a,b,c,d){if(null!=a&&null!=a.pe)return a.pe(a,b,c,d);var e=bd[y(null==a?null:a)];if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);e=bd._;if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);throw D("ISwap.-swap!",a);};
bd.w=function(a,b,c,d,e){if(null!=a&&null!=a.qe)return a.qe(a,b,c,d,e);var f=bd[y(null==a?null:a)];if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);f=bd._;if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);throw D("ISwap.-swap!",a);};bd.A=5;var cd=function cd(b){if(null!=b&&null!=b.Sa)return b.Sa(b);var c=cd[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=cd._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IIterable.-iterator",b);};
function dd(a){this.Te=a;this.i=1073741824;this.C=0}dd.prototype.rd=function(a,b){return this.Te.append(b)};function ed(a){var b=new zb;a.M(null,new dd(b),Gb());return""+F(b)}var fd="undefined"!==typeof Math.imul&&0!==Math.imul(4294967295,5)?function(a,b){return Math.imul(a,b)}:function(a,b){var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};function gd(a){a=fd(a|0,-862048943);return fd(a<<15|a>>>-15,461845907)}
function hd(a,b){var c=(a|0)^(b|0);return fd(c<<13|c>>>-13,5)+-430675100|0}function id(a,b){var c=(a|0)^b,c=fd(c^c>>>16,-2048144789),c=fd(c^c>>>13,-1028477387);return c^c>>>16}function jd(a){var b;a:{b=1;for(var c=0;;)if(b<a.length){var d=b+2,c=hd(c,gd(a.charCodeAt(b-1)|a.charCodeAt(b)<<16));b=d}else{b=c;break a}}b=1===(a.length&1)?b^gd(a.charCodeAt(a.length-1)):b;return id(b,fd(2,a.length))}kd;ld;md;nd;var od={},pd=0;
function qd(a){255<pd&&(od={},pd=0);var b=od[a];if("number"!==typeof b){a:if(null!=a)if(b=a.length,0<b)for(var c=0,d=0;;)if(c<b)var e=c+1,d=fd(31,d)+a.charCodeAt(c),c=e;else{b=d;break a}else b=0;else b=0;od[a]=b;pd+=1}return a=b}function rd(a){null!=a&&(a.i&4194304||a.zf)?a=a.P(null):"number"===typeof a?a=Math.floor(a)%2147483647:!0===a?a=1:!1===a?a=0:"string"===typeof a?(a=qd(a),0!==a&&(a=gd(a),a=hd(0,a),a=id(a,4))):a=a instanceof Date?a.valueOf():null==a?0:Dc(a);return a}
function sd(a,b){return a^b+2654435769+(a<<6)+(a>>2)}function Pb(a,b){return b instanceof a}function td(a,b){if(a.Ra===b.Ra)return 0;var c=Rb(a.ta);if(A(c?b.ta:c))return-1;if(A(a.ta)){if(Rb(b.ta))return 1;c=Sa(a.ta,b.ta);return 0===c?Sa(a.name,b.name):c}return Sa(a.name,b.name)}H;function ld(a,b,c,d,e){this.ta=a;this.name=b;this.Ra=c;this.sb=d;this.ya=e;this.i=2154168321;this.C=4096}g=ld.prototype;g.toString=function(){return this.Ra};g.equiv=function(a){return this.v(null,a)};
g.v=function(a,b){return b instanceof ld?this.Ra===b.Ra:!1};g.call=function(){function a(a,b,c){return H.c?H.c(b,this,c):H.call(null,b,this,c)}function b(a,b){return H.b?H.b(b,this):H.call(null,b,this)}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,0,e);case 3:return a.call(this,0,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.a=function(a){return H.b?H.b(a,this):H.call(null,a,this)};g.b=function(a,b){return H.c?H.c(a,this,b):H.call(null,a,this,b)};g.S=function(){return this.ya};g.U=function(a,b){return new ld(this.ta,this.name,this.Ra,this.sb,b)};g.P=function(){var a=this.sb;return null!=a?a:this.sb=a=sd(jd(this.name),qd(this.ta))};g.Qb=function(){return this.name};g.Rb=function(){return this.ta};g.M=function(a,b){return Lc(b,this.Ra)};
var ud=function ud(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return ud.a(arguments[0]);case 2:return ud.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};ud.a=function(a){if(a instanceof ld)return a;var b=a.indexOf("/");return-1===b?ud.b(null,a):ud.b(a.substring(0,b),a.substring(b+1,a.length))};ud.b=function(a,b){var c=null!=a?[F(a),F("/"),F(b)].join(""):b;return new ld(a,b,c,null,null)};
ud.A=2;vd;wd;xd;function I(a){if(null==a)return null;if(null!=a&&(a.i&8388608||a.me))return a.T(null);if(Qb(a)||"string"===typeof a)return 0===a.length?null:new xd(a,0);if(C(Ec,a))return Fc(a);throw Error([F(a),F(" is not ISeqable")].join(""));}function K(a){if(null==a)return null;if(null!=a&&(a.i&64||a.gb))return a.ca(null);a=I(a);return null==a?null:gc(a)}function yd(a){return null!=a?null!=a&&(a.i&64||a.gb)?a.va(null):(a=I(a))?hc(a):zd:zd}
function L(a){return null==a?null:null!=a&&(a.i&128||a.mc)?a.ua(null):I(yd(a))}var md=function md(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return md.a(arguments[0]);case 2:return md.b(arguments[0],arguments[1]);default:return md.s(arguments[0],arguments[1],new xd(c.slice(2),0))}};md.a=function(){return!0};md.b=function(a,b){return null==a?null==b:a===b||Cc(a,b)};
md.s=function(a,b,c){for(;;)if(md.b(a,b))if(L(c))a=b,b=K(c),c=L(c);else return md.b(b,K(c));else return!1};md.J=function(a){var b=K(a),c=L(a);a=K(c);c=L(c);return md.s(b,a,c)};md.A=2;function Ad(a){this.D=a}Ad.prototype.next=function(){if(null!=this.D){var a=K(this.D);this.D=L(this.D);return{value:a,done:!1}}return{value:null,done:!0}};function Bd(a){return new Ad(I(a))}Cd;function Dd(a,b,c){this.value=a;this.Bb=b;this.Ic=c;this.i=8388672;this.C=0}Dd.prototype.T=function(){return this};
Dd.prototype.ca=function(){return this.value};Dd.prototype.va=function(){null==this.Ic&&(this.Ic=Cd.a?Cd.a(this.Bb):Cd.call(null,this.Bb));return this.Ic};function Cd(a){var b=a.next();return A(b.done)?zd:new Dd(b.value,a,null)}function Ed(a,b){var c=gd(a),c=hd(0,c);return id(c,b)}function Fd(a){var b=0,c=1;for(a=I(a);;)if(null!=a)b+=1,c=fd(31,c)+rd(K(a))|0,a=L(a);else return Ed(c,b)}var Gd=Ed(1,0);function Hd(a){var b=0,c=0;for(a=I(a);;)if(null!=a)b+=1,c=c+rd(K(a))|0,a=L(a);else return Ed(c,b)}
var Id=Ed(0,0);Jd;kd;Ld;Yb["null"]=!0;Zb["null"]=function(){return 0};Date.prototype.v=function(a,b){return b instanceof Date&&this.valueOf()===b.valueOf()};Date.prototype.Mb=!0;Date.prototype.vb=function(a,b){if(b instanceof Date)return Sa(this.valueOf(),b.valueOf());throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};Cc.number=function(a,b){return a===b};Md;xc["function"]=!0;yc["function"]=function(){return null};Dc._=function(a){return ja(a)};M;
function Nd(a){this.K=a;this.i=32768;this.C=0}Nd.prototype.lc=function(){return this.K};function Od(a){return a instanceof Nd}function M(a){return wc(a)}function Pd(a,b){var c=Zb(a);if(0===c)return b.B?b.B():b.call(null);for(var d=G.b(a,0),e=1;;)if(e<c){var f=G.b(a,e),d=b.b?b.b(d,f):b.call(null,d,f);if(Od(d))return wc(d);e+=1}else return d}function Qd(a,b,c){var d=Zb(a),e=c;for(c=0;;)if(c<d){var f=G.b(a,c),e=b.b?b.b(e,f):b.call(null,e,f);if(Od(e))return wc(e);c+=1}else return e}
function Rd(a,b){var c=a.length;if(0===a.length)return b.B?b.B():b.call(null);for(var d=a[0],e=1;;)if(e<c){var f=a[e],d=b.b?b.b(d,f):b.call(null,d,f);if(Od(d))return wc(d);e+=1}else return d}function Sd(a,b,c){var d=a.length,e=c;for(c=0;;)if(c<d){var f=a[c],e=b.b?b.b(e,f):b.call(null,e,f);if(Od(e))return wc(e);c+=1}else return e}function Td(a,b,c,d){for(var e=a.length;;)if(d<e){var f=a[d];c=b.b?b.b(c,f):b.call(null,c,f);if(Od(c))return wc(c);d+=1}else return c}Ud;N;Vd;Wd;
function Xd(a){return null!=a?a.i&2||a.be?!0:a.i?!1:C(Yb,a):C(Yb,a)}function Yd(a){return null!=a?a.i&16||a.nd?!0:a.i?!1:C(ec,a):C(ec,a)}function Zd(a,b){this.f=a;this.l=b}Zd.prototype.Ba=function(){return this.l<this.f.length};Zd.prototype.next=function(){var a=this.f[this.l];this.l+=1;return a};function xd(a,b){this.f=a;this.l=b;this.i=166199550;this.C=8192}g=xd.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};
g.O=function(a,b){var c=b+this.l;return c<this.f.length?this.f[c]:null};g.Aa=function(a,b,c){a=b+this.l;return a<this.f.length?this.f[a]:c};g.Sa=function(){return new Zd(this.f,this.l)};g.ua=function(){return this.l+1<this.f.length?new xd(this.f,this.l+1):null};g.Y=function(){var a=this.f.length-this.l;return 0>a?0:a};g.nc=function(){var a=Zb(this);return 0<a?new Vd(this,a-1,null):null};g.P=function(){return Fd(this)};g.v=function(a,b){return Ld.b?Ld.b(this,b):Ld.call(null,this,b)};g.X=function(){return zd};
g.aa=function(a,b){return Td(this.f,b,this.f[this.l],this.l+1)};g.ba=function(a,b,c){return Td(this.f,b,c,this.l)};g.ca=function(){return this.f[this.l]};g.va=function(){return this.l+1<this.f.length?new xd(this.f,this.l+1):zd};g.T=function(){return this.l<this.f.length?this:null};g.V=function(a,b){return N.b?N.b(b,this):N.call(null,b,this)};xd.prototype[Ub]=function(){return Bd(this)};
var wd=function wd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return wd.a(arguments[0]);case 2:return wd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};wd.a=function(a){return wd.b(a,0)};wd.b=function(a,b){return b<a.length?new xd(a,b):null};wd.A=2;
var vd=function vd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return vd.a(arguments[0]);case 2:return vd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};vd.a=function(a){return wd.b(a,0)};vd.b=function(a,b){return wd.b(a,b)};vd.A=2;Md;$d;function Vd(a,b,c){this.kc=a;this.l=b;this.o=c;this.i=32374990;this.C=8192}g=Vd.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};g.ua=function(){return 0<this.l?new Vd(this.kc,this.l-1,null):null};g.Y=function(){return this.l+1};g.P=function(){return Fd(this)};g.v=function(a,b){return Ld.b?Ld.b(this,b):Ld.call(null,this,b)};g.X=function(){var a=zd,b=this.o;return Md.b?Md.b(a,b):Md.call(null,a,b)};g.aa=function(a,b){return $d.b?$d.b(b,this):$d.call(null,b,this)};g.ba=function(a,b,c){return $d.c?$d.c(b,c,this):$d.call(null,b,c,this)};
g.ca=function(){return G.b(this.kc,this.l)};g.va=function(){return 0<this.l?new Vd(this.kc,this.l-1,null):zd};g.T=function(){return this};g.U=function(a,b){return new Vd(this.kc,this.l,b)};g.V=function(a,b){return N.b?N.b(b,this):N.call(null,b,this)};Vd.prototype[Ub]=function(){return Bd(this)};function ae(a){return K(L(a))}Cc._=function(a,b){return a===b};
var be=function be(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return be.B();case 1:return be.a(arguments[0]);case 2:return be.b(arguments[0],arguments[1]);default:return be.s(arguments[0],arguments[1],new xd(c.slice(2),0))}};be.B=function(){return ce};be.a=function(a){return a};be.b=function(a,b){return null!=a?bc(a,b):bc(zd,b)};be.s=function(a,b,c){for(;;)if(A(c))a=be.b(a,b),b=K(c),c=L(c);else return be.b(a,b)};
be.J=function(a){var b=K(a),c=L(a);a=K(c);c=L(c);return be.s(b,a,c)};be.A=2;function O(a){if(null!=a)if(null!=a&&(a.i&2||a.be))a=a.Y(null);else if(Qb(a))a=a.length;else if("string"===typeof a)a=a.length;else if(null!=a&&(a.i&8388608||a.me))a:{a=I(a);for(var b=0;;){if(Xd(a)){a=b+Zb(a);break a}a=L(a);b+=1}}else a=Zb(a);else a=0;return a}function de(a,b){for(var c=null;;){if(null==a)return c;if(0===b)return I(a)?K(a):c;if(Yd(a))return G.c(a,b,c);if(I(a)){var d=L(a),e=b-1;a=d;b=e}else return c}}
function ee(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number");if(null==a)return a;if(null!=a&&(a.i&16||a.nd))return a.O(null,b);if(Qb(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.gb)){var c;a:{c=a;for(var d=b;;){if(null==c)throw Error("Index out of bounds");if(0===d){if(I(c)){c=K(c);break a}throw Error("Index out of bounds");}if(Yd(c)){c=G.b(c,d);break a}if(I(c))c=L(c),--d;else throw Error("Index out of bounds");
}}return c}if(C(ec,a))return G.b(a,b);throw Error([F("nth not supported on this type "),F(Tb(Sb(a)))].join(""));}
function P(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number.");if(null==a)return null;if(null!=a&&(a.i&16||a.nd))return a.Aa(null,b,null);if(Qb(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.gb))return de(a,b);if(C(ec,a))return G.b(a,b);throw Error([F("nth not supported on this type "),F(Tb(Sb(a)))].join(""));}
var H=function H(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return H.b(arguments[0],arguments[1]);case 3:return H.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};H.b=function(a,b){return null==a?null:null!=a&&(a.i&256||a.od)?a.L(null,b):Qb(a)?b<a.length?a[b|0]:null:"string"===typeof a?b<a.length?a[b|0]:null:C(jc,a)?kc.b(a,b):null};
H.c=function(a,b,c){return null!=a?null!=a&&(a.i&256||a.od)?a.G(null,b,c):Qb(a)?b<a.length?a[b]:c:"string"===typeof a?b<a.length?a[b]:c:C(jc,a)?kc.c(a,b,c):c:c};H.A=3;fe;var ge=function ge(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return ge.c(arguments[0],arguments[1],arguments[2]);default:return ge.s(arguments[0],arguments[1],arguments[2],new xd(c.slice(3),0))}};
ge.c=function(a,b,c){if(null!=a)a=mc(a,b,c);else a:{a=[b];c=[c];b=a.length;var d=0,e;for(e=Oc(he);;)if(d<b){var f=d+1;e=e.Sb(null,a[d],c[d]);d=f}else{a=Qc(e);break a}}return a};ge.s=function(a,b,c,d){for(;;)if(a=ge.c(a,b,c),A(d))b=K(d),c=ae(d),d=L(L(d));else return a};ge.J=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),d=L(d);return ge.s(b,a,c,d)};ge.A=3;function ie(a,b){this.g=a;this.o=b;this.i=393217;this.C=0}g=ie.prototype;g.S=function(){return this.o};
g.U=function(a,b){return new ie(this.g,b)};
g.call=function(){function a(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J,S){a=this;return Wb.Nb?Wb.Nb(a.g,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J,S):Wb.call(null,a.g,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J,S)}function b(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J){a=this;return a.g.oa?a.g.oa(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J)}function c(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E){a=this;return a.g.na?a.g.na(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,
E):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E)}function d(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x){a=this;return a.g.ma?a.g.ma(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x)}function e(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z){a=this;return a.g.la?a.g.la(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z)}function f(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w){a=this;return a.g.ka?a.g.ka(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):a.g.call(null,
b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w)}function h(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v){a=this;return a.g.ja?a.g.ja(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v)}function k(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u){a=this;return a.g.ia?a.g.ia(b,c,d,e,f,h,k,l,m,n,p,q,r,u):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u)}function l(a,b,c,d,e,f,h,k,l,m,n,p,q,r){a=this;return a.g.ha?a.g.ha(b,c,d,e,f,h,k,l,m,n,p,q,r):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r)}function m(a,b,c,d,e,f,h,k,l,m,n,p,q){a=this;
return a.g.ga?a.g.ga(b,c,d,e,f,h,k,l,m,n,p,q):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p,q)}function n(a,b,c,d,e,f,h,k,l,m,n,p){a=this;return a.g.fa?a.g.fa(b,c,d,e,f,h,k,l,m,n,p):a.g.call(null,b,c,d,e,f,h,k,l,m,n,p)}function p(a,b,c,d,e,f,h,k,l,m,n){a=this;return a.g.ea?a.g.ea(b,c,d,e,f,h,k,l,m,n):a.g.call(null,b,c,d,e,f,h,k,l,m,n)}function q(a,b,c,d,e,f,h,k,l,m){a=this;return a.g.qa?a.g.qa(b,c,d,e,f,h,k,l,m):a.g.call(null,b,c,d,e,f,h,k,l,m)}function r(a,b,c,d,e,f,h,k,l){a=this;return a.g.pa?a.g.pa(b,c,
d,e,f,h,k,l):a.g.call(null,b,c,d,e,f,h,k,l)}function u(a,b,c,d,e,f,h,k){a=this;return a.g.W?a.g.W(b,c,d,e,f,h,k):a.g.call(null,b,c,d,e,f,h,k)}function v(a,b,c,d,e,f,h){a=this;return a.g.I?a.g.I(b,c,d,e,f,h):a.g.call(null,b,c,d,e,f,h)}function w(a,b,c,d,e,f){a=this;return a.g.w?a.g.w(b,c,d,e,f):a.g.call(null,b,c,d,e,f)}function z(a,b,c,d,e){a=this;return a.g.m?a.g.m(b,c,d,e):a.g.call(null,b,c,d,e)}function E(a,b,c,d){a=this;return a.g.c?a.g.c(b,c,d):a.g.call(null,b,c,d)}function J(a,b,c){a=this;return a.g.b?
a.g.b(b,c):a.g.call(null,b,c)}function S(a,b){a=this;return a.g.a?a.g.a(b):a.g.call(null,b)}function ra(a){a=this;return a.g.B?a.g.B():a.g.call(null)}var x=null,x=function(Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db,qb,Jb,dc,Kc,Kd,Zf){switch(arguments.length){case 1:return ra.call(this,Da);case 2:return S.call(this,Da,R);case 3:return J.call(this,Da,R,T);case 4:return E.call(this,Da,R,T,X);case 5:return z.call(this,Da,R,T,X,Y);case 6:return w.call(this,Da,R,T,X,Y,ca);case 7:return v.call(this,Da,R,
T,X,Y,ca,ha);case 8:return u.call(this,Da,R,T,X,Y,ca,ha,ka);case 9:return r.call(this,Da,R,T,X,Y,ca,ha,ka,na);case 10:return q.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa);case 11:return p.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va);case 12:return n.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya);case 13:return m.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka);case 14:return l.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x);case 15:return k.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua);case 16:return h.call(this,
Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db);case 17:return f.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db,qb);case 18:return e.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db,qb,Jb);case 19:return d.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db,qb,Jb,dc);case 20:return c.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db,qb,Jb,dc,Kc);case 21:return b.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,x,Ua,db,qb,Jb,dc,Kc,Kd);case 22:return a.call(this,Da,R,T,X,Y,ca,ha,ka,na,qa,va,ya,
Ka,x,Ua,db,qb,Jb,dc,Kc,Kd,Zf)}throw Error("Invalid arity: "+arguments.length);};x.a=ra;x.b=S;x.c=J;x.m=E;x.w=z;x.I=w;x.W=v;x.pa=u;x.qa=r;x.ea=q;x.fa=p;x.ga=n;x.ha=m;x.ia=l;x.ja=k;x.ka=h;x.la=f;x.ma=e;x.na=d;x.oa=c;x.Sc=b;x.Nb=a;return x}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.B=function(){return this.g.B?this.g.B():this.g.call(null)};g.a=function(a){return this.g.a?this.g.a(a):this.g.call(null,a)};
g.b=function(a,b){return this.g.b?this.g.b(a,b):this.g.call(null,a,b)};g.c=function(a,b,c){return this.g.c?this.g.c(a,b,c):this.g.call(null,a,b,c)};g.m=function(a,b,c,d){return this.g.m?this.g.m(a,b,c,d):this.g.call(null,a,b,c,d)};g.w=function(a,b,c,d,e){return this.g.w?this.g.w(a,b,c,d,e):this.g.call(null,a,b,c,d,e)};g.I=function(a,b,c,d,e,f){return this.g.I?this.g.I(a,b,c,d,e,f):this.g.call(null,a,b,c,d,e,f)};
g.W=function(a,b,c,d,e,f,h){return this.g.W?this.g.W(a,b,c,d,e,f,h):this.g.call(null,a,b,c,d,e,f,h)};g.pa=function(a,b,c,d,e,f,h,k){return this.g.pa?this.g.pa(a,b,c,d,e,f,h,k):this.g.call(null,a,b,c,d,e,f,h,k)};g.qa=function(a,b,c,d,e,f,h,k,l){return this.g.qa?this.g.qa(a,b,c,d,e,f,h,k,l):this.g.call(null,a,b,c,d,e,f,h,k,l)};g.ea=function(a,b,c,d,e,f,h,k,l,m){return this.g.ea?this.g.ea(a,b,c,d,e,f,h,k,l,m):this.g.call(null,a,b,c,d,e,f,h,k,l,m)};
g.fa=function(a,b,c,d,e,f,h,k,l,m,n){return this.g.fa?this.g.fa(a,b,c,d,e,f,h,k,l,m,n):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n)};g.ga=function(a,b,c,d,e,f,h,k,l,m,n,p){return this.g.ga?this.g.ga(a,b,c,d,e,f,h,k,l,m,n,p):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p)};g.ha=function(a,b,c,d,e,f,h,k,l,m,n,p,q){return this.g.ha?this.g.ha(a,b,c,d,e,f,h,k,l,m,n,p,q):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q)};
g.ia=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r){return this.g.ia?this.g.ia(a,b,c,d,e,f,h,k,l,m,n,p,q,r):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r)};g.ja=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u){return this.g.ja?this.g.ja(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u)};g.ka=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v){return this.g.ka?this.g.ka(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v)};
g.la=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w){return this.g.la?this.g.la(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w)};g.ma=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z){return this.g.ma?this.g.ma(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z)};
g.na=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E){return this.g.na?this.g.na(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E)};g.oa=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J){return this.g.oa?this.g.oa(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J):this.g.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J)};
g.Sc=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S){return Wb.Nb?Wb.Nb(this.g,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S):Wb.call(null,this.g,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S)};function Md(a,b){return ga(a)?new ie(a,b):null==a?null:zc(a,b)}function je(a){var b=null!=a;return(b?null!=a?a.i&131072||a.ie||(a.i?0:C(xc,a)):C(xc,a):b)?yc(a):null}function ke(a){return null==a?!1:null!=a?a.i&8||a.xf?!0:a.i?!1:C(ac,a):C(ac,a)}
function le(a){return null==a?!1:null!=a?a.i&4096||a.Df?!0:a.i?!1:C(rc,a):C(rc,a)}function me(a){return null!=a?a.i&16777216||a.Cf?!0:a.i?!1:C(Gc,a):C(Gc,a)}function ne(a){return null==a?!1:null!=a?a.i&1024||a.ge?!0:a.i?!1:C(nc,a):C(nc,a)}function oe(a){return null!=a?a.i&16384||a.Ef?!0:a.i?!1:C(uc,a):C(uc,a)}pe;qe;function re(a){return null!=a?a.C&512||a.wf?!0:!1:!1}function se(a){var b=[];Ya(a,function(a,b){return function(a,c){return b.push(c)}}(a,b));return b}
function te(a,b,c,d,e){for(;0!==e;)c[d]=a[b],d+=1,--e,b+=1}var ue={};function ve(a){return null==a?!1:null!=a?a.i&64||a.gb?!0:a.i?!1:C(fc,a):C(fc,a)}function we(a){return null==a?!1:!1===a?!1:!0}function xe(a,b){return H.c(a,b,ue)===ue?!1:!0}
function nd(a,b){if(a===b)return 0;if(null==a)return-1;if(null==b)return 1;if("number"===typeof a){if("number"===typeof b)return Sa(a,b);throw Error([F("Cannot compare "),F(a),F(" to "),F(b)].join(""));}if(null!=a?a.C&2048||a.Mb||(a.C?0:C(Tc,a)):C(Tc,a))return Uc(a,b);if("string"!==typeof a&&!Qb(a)&&!0!==a&&!1!==a||Sb(a)!==Sb(b))throw Error([F("Cannot compare "),F(a),F(" to "),F(b)].join(""));return Sa(a,b)}
function ye(a,b){var c=O(a),d=O(b);if(c<d)c=-1;else if(c>d)c=1;else if(0===c)c=0;else a:for(d=0;;){var e=nd(ee(a,d),ee(b,d));if(0===e&&d+1<c)d+=1;else{c=e;break a}}return c}ze;var $d=function $d(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return $d.b(arguments[0],arguments[1]);case 3:return $d.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
$d.b=function(a,b){var c=I(b);if(c){var d=K(c),c=L(c);return Xb.c?Xb.c(a,d,c):Xb.call(null,a,d,c)}return a.B?a.B():a.call(null)};$d.c=function(a,b,c){for(c=I(c);;)if(c){var d=K(c);b=a.b?a.b(b,d):a.call(null,b,d);if(Od(b))return wc(b);c=L(c)}else return b};$d.A=3;Ae;
var Xb=function Xb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Xb.b(arguments[0],arguments[1]);case 3:return Xb.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Xb.b=function(a,b){return null!=b&&(b.i&524288||b.ke)?b.aa(null,a):Qb(b)?Rd(b,a):"string"===typeof b?Rd(b,a):C(Ac,b)?Bc.b(b,a):$d.b(a,b)};
Xb.c=function(a,b,c){return null!=c&&(c.i&524288||c.ke)?c.ba(null,a,b):Qb(c)?Sd(c,a,b):"string"===typeof c?Sd(c,a,b):C(Ac,c)?Bc.c(c,a,b):$d.c(a,b,c)};Xb.A=3;function Be(a){return a}function Ce(a,b,c,d){a=a.a?a.a(b):a.call(null,b);c=Xb.c(a,c,d);return a.a?a.a(c):a.call(null,c)}Ab.If;De;function De(a,b){return(a%b+b)%b}function Ee(a){a=(a-a%2)/2;return 0<=a?Math.floor(a):Math.ceil(a)}function Fe(a){a-=a>>1&1431655765;a=(a&858993459)+(a>>2&858993459);return 16843009*(a+(a>>4)&252645135)>>24}
function Ge(a){var b=1;for(a=I(a);;)if(a&&0<b)--b,a=L(a);else return a}var F=function F(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return F.B();case 1:return F.a(arguments[0]);default:return F.s(arguments[0],new xd(c.slice(1),0))}};F.B=function(){return""};F.a=function(a){return null==a?"":""+a};F.s=function(a,b){for(var c=new zb(""+F(a)),d=b;;)if(A(d))c=c.append(""+F(K(d))),d=L(d);else return c.toString()};
F.J=function(a){var b=K(a);a=L(a);return F.s(b,a)};F.A=1;He;Ie;function Ld(a,b){var c;if(me(b))if(Xd(a)&&Xd(b)&&O(a)!==O(b))c=!1;else a:{c=I(a);for(var d=I(b);;){if(null==c){c=null==d;break a}if(null!=d&&md.b(K(c),K(d)))c=L(c),d=L(d);else{c=!1;break a}}}else c=null;return we(c)}function Ud(a){if(I(a)){var b=rd(K(a));for(a=L(a);;){if(null==a)return b;b=sd(b,rd(K(a)));a=L(a)}}else return 0}Je;Ke;Ie;Le;Me;
function Wd(a,b,c,d,e){this.o=a;this.first=b;this.xa=c;this.count=d;this.u=e;this.i=65937646;this.C=8192}g=Wd.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};g.ua=function(){return 1===this.count?null:this.xa};g.Y=function(){return this.count};g.hb=function(){return this.first};g.ib=function(){return hc(this)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};
g.X=function(){return zc(zd,this.o)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.first};g.va=function(){return 1===this.count?zd:this.xa};g.T=function(){return this};g.U=function(a,b){return new Wd(b,this.first,this.xa,this.count,this.u)};g.V=function(a,b){return new Wd(this.o,b,this,this.count+1,null)};Wd.prototype[Ub]=function(){return Bd(this)};function Ne(a){this.o=a;this.i=65937614;this.C=8192}g=Ne.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};g.ua=function(){return null};g.Y=function(){return 0};g.hb=function(){return null};g.ib=function(){throw Error("Can't pop empty list");};g.P=function(){return Gd};g.v=function(a,b){return(null!=b?b.i&33554432||b.Af||(b.i?0:C(Hc,b)):C(Hc,b))||me(b)?null==I(b):!1};g.X=function(){return this};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return null};g.va=function(){return zd};
g.T=function(){return null};g.U=function(a,b){return new Ne(b)};g.V=function(a,b){return new Wd(this.o,b,null,1,null)};var zd=new Ne(null);Ne.prototype[Ub]=function(){return Bd(this)};function Oe(a){return(null!=a?a.i&134217728||a.Bf||(a.i?0:C(Ic,a)):C(Ic,a))?Jc(a):Xb.c(be,zd,a)}var kd=function kd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return kd.s(0<c.length?new xd(c.slice(0),0):null)};
kd.s=function(a){var b;if(a instanceof xd&&0===a.l)b=a.f;else a:for(b=[];;)if(null!=a)b.push(a.ca(null)),a=a.ua(null);else break a;a=b.length;for(var c=zd;;)if(0<a){var d=a-1,c=c.V(null,b[a-1]);a=d}else return c};kd.A=0;kd.J=function(a){return kd.s(I(a))};function Pe(a,b,c,d){this.o=a;this.first=b;this.xa=c;this.u=d;this.i=65929452;this.C=8192}g=Pe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};
g.ua=function(){return null==this.xa?null:I(this.xa)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.o)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.first};g.va=function(){return null==this.xa?zd:this.xa};g.T=function(){return this};g.U=function(a,b){return new Pe(b,this.first,this.xa,this.u)};g.V=function(a,b){return new Pe(null,b,this,this.u)};
Pe.prototype[Ub]=function(){return Bd(this)};function N(a,b){var c=null==b;return(c?c:null!=b&&(b.i&64||b.gb))?new Pe(null,a,b,null):new Pe(null,a,I(b),null)}function Qe(a,b){if(a.Oa===b.Oa)return 0;var c=Rb(a.ta);if(A(c?b.ta:c))return-1;if(A(a.ta)){if(Rb(b.ta))return 1;c=Sa(a.ta,b.ta);return 0===c?Sa(a.name,b.name):c}return Sa(a.name,b.name)}function B(a,b,c,d){this.ta=a;this.name=b;this.Oa=c;this.sb=d;this.i=2153775105;this.C=4096}g=B.prototype;g.toString=function(){return[F(":"),F(this.Oa)].join("")};
g.equiv=function(a){return this.v(null,a)};g.v=function(a,b){return b instanceof B?this.Oa===b.Oa:!1};g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return H.b(c,this);case 3:return H.c(c,this,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return H.b(c,this)};a.c=function(a,c,d){return H.c(c,this,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return H.b(a,this)};
g.b=function(a,b){return H.c(a,this,b)};g.P=function(){var a=this.sb;return null!=a?a:this.sb=a=sd(jd(this.name),qd(this.ta))+2654435769|0};g.Qb=function(){return this.name};g.Rb=function(){return this.ta};g.M=function(a,b){return Lc(b,[F(":"),F(this.Oa)].join(""))};
var Re=function Re(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Re.a(arguments[0]);case 2:return Re.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Re.a=function(a){if(a instanceof B)return a;if(a instanceof ld){var b;if(null!=a&&(a.C&4096||a.je))b=a.Rb(null);else throw Error([F("Doesn't support namespace: "),F(a)].join(""));return new B(b,Ie.a?Ie.a(a):Ie.call(null,a),a.Ra,null)}return"string"===typeof a?(b=a.split("/"),2===b.length?new B(b[0],b[1],a,null):new B(null,b[0],a,null)):null};Re.b=function(a,b){return new B(a,b,[F(A(a)?[F(a),F("/")].join(""):null),F(b)].join(""),null)};Re.A=2;
function Se(a,b,c,d){this.o=a;this.Na=b;this.D=c;this.u=d;this.i=32374988;this.C=0}g=Se.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};function Te(a){null!=a.Na&&(a.D=a.Na.B?a.Na.B():a.Na.call(null),a.Na=null);return a.D}g.S=function(){return this.o};g.ua=function(){Fc(this);return null==this.D?null:L(this.D)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.o)};
g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){Fc(this);return null==this.D?null:K(this.D)};g.va=function(){Fc(this);return null!=this.D?yd(this.D):zd};g.T=function(){Te(this);if(null==this.D)return null;for(var a=this.D;;)if(a instanceof Se)a=Te(a);else return this.D=a,I(this.D)};g.U=function(a,b){return new Se(b,this.Na,this.D,this.u)};g.V=function(a,b){return N(b,this)};Se.prototype[Ub]=function(){return Bd(this)};Ue;
function Ve(a,b){this.Mc=a;this.end=b;this.i=2;this.C=0}Ve.prototype.add=function(a){this.Mc[this.end]=a;return this.end+=1};Ve.prototype.Fa=function(){var a=new Ue(this.Mc,0,this.end);this.Mc=null;return a};Ve.prototype.Y=function(){return this.end};function Ue(a,b,c){this.f=a;this.da=b;this.end=c;this.i=524306;this.C=0}g=Ue.prototype;g.Y=function(){return this.end-this.da};g.O=function(a,b){return this.f[this.da+b]};g.Aa=function(a,b,c){return 0<=b&&b<this.end-this.da?this.f[this.da+b]:c};
g.md=function(){if(this.da===this.end)throw Error("-drop-first of empty chunk");return new Ue(this.f,this.da+1,this.end)};g.aa=function(a,b){return Td(this.f,b,this.f[this.da],this.da+1)};g.ba=function(a,b,c){return Td(this.f,b,c,this.da)};function pe(a,b,c,d){this.Fa=a;this.Pa=b;this.o=c;this.u=d;this.i=31850732;this.C=1536}g=pe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};
g.ua=function(){if(1<Zb(this.Fa))return new pe(Vc(this.Fa),this.Pa,this.o,null);var a=Fc(this.Pa);return null==a?null:a};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.o)};g.ca=function(){return G.b(this.Fa,0)};g.va=function(){return 1<Zb(this.Fa)?new pe(Vc(this.Fa),this.Pa,this.o,null):null==this.Pa?zd:this.Pa};g.T=function(){return this};g.Qc=function(){return this.Fa};
g.Rc=function(){return null==this.Pa?zd:this.Pa};g.U=function(a,b){return new pe(this.Fa,this.Pa,b,this.u)};g.V=function(a,b){return N(b,this)};g.Pc=function(){return null==this.Pa?null:this.Pa};pe.prototype[Ub]=function(){return Bd(this)};function We(a,b){return 0===Zb(a)?b:new pe(a,b,null,null)}function Xe(a,b){a.add(b)}function Le(a){return Wc(a)}function Me(a){return Xc(a)}function ze(a){for(var b=[];;)if(I(a))b.push(K(a)),a=L(a);else return b}
function Ye(a,b){if(Xd(a))return O(a);for(var c=a,d=b,e=0;;)if(0<d&&I(c))c=L(c),--d,e+=1;else return e}var Ze=function Ze(b){return null==b?null:null==L(b)?I(K(b)):N(K(b),Ze(L(b)))};function $e(a){return Qc(a)}var af=function af(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return af.B();case 1:return af.a(arguments[0]);case 2:return af.b(arguments[0],arguments[1]);default:return af.s(arguments[0],arguments[1],new xd(c.slice(2),0))}};
af.B=function(){return Oc(ce)};af.a=function(a){return a};af.b=function(a,b){return Pc(a,b)};af.s=function(a,b,c){for(;;)if(a=Pc(a,b),A(c))b=K(c),c=L(c);else return a};af.J=function(a){var b=K(a),c=L(a);a=K(c);c=L(c);return af.s(b,a,c)};af.A=2;
function bf(a,b,c){var d=I(c);if(0===b)return a.B?a.B():a.call(null);c=gc(d);var e=hc(d);if(1===b)return a.a?a.a(c):a.a?a.a(c):a.call(null,c);var d=gc(e),f=hc(e);if(2===b)return a.b?a.b(c,d):a.b?a.b(c,d):a.call(null,c,d);var e=gc(f),h=hc(f);if(3===b)return a.c?a.c(c,d,e):a.c?a.c(c,d,e):a.call(null,c,d,e);var f=gc(h),k=hc(h);if(4===b)return a.m?a.m(c,d,e,f):a.m?a.m(c,d,e,f):a.call(null,c,d,e,f);var h=gc(k),l=hc(k);if(5===b)return a.w?a.w(c,d,e,f,h):a.w?a.w(c,d,e,f,h):a.call(null,c,d,e,f,h);var k=gc(l),
m=hc(l);if(6===b)return a.I?a.I(c,d,e,f,h,k):a.I?a.I(c,d,e,f,h,k):a.call(null,c,d,e,f,h,k);var l=gc(m),n=hc(m);if(7===b)return a.W?a.W(c,d,e,f,h,k,l):a.W?a.W(c,d,e,f,h,k,l):a.call(null,c,d,e,f,h,k,l);var m=gc(n),p=hc(n);if(8===b)return a.pa?a.pa(c,d,e,f,h,k,l,m):a.pa?a.pa(c,d,e,f,h,k,l,m):a.call(null,c,d,e,f,h,k,l,m);var n=gc(p),q=hc(p);if(9===b)return a.qa?a.qa(c,d,e,f,h,k,l,m,n):a.qa?a.qa(c,d,e,f,h,k,l,m,n):a.call(null,c,d,e,f,h,k,l,m,n);var p=gc(q),r=hc(q);if(10===b)return a.ea?a.ea(c,d,e,f,h,
k,l,m,n,p):a.ea?a.ea(c,d,e,f,h,k,l,m,n,p):a.call(null,c,d,e,f,h,k,l,m,n,p);var q=gc(r),u=hc(r);if(11===b)return a.fa?a.fa(c,d,e,f,h,k,l,m,n,p,q):a.fa?a.fa(c,d,e,f,h,k,l,m,n,p,q):a.call(null,c,d,e,f,h,k,l,m,n,p,q);var r=gc(u),v=hc(u);if(12===b)return a.ga?a.ga(c,d,e,f,h,k,l,m,n,p,q,r):a.ga?a.ga(c,d,e,f,h,k,l,m,n,p,q,r):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r);var u=gc(v),w=hc(v);if(13===b)return a.ha?a.ha(c,d,e,f,h,k,l,m,n,p,q,r,u):a.ha?a.ha(c,d,e,f,h,k,l,m,n,p,q,r,u):a.call(null,c,d,e,f,h,k,l,m,n,p,q,
r,u);var v=gc(w),z=hc(w);if(14===b)return a.ia?a.ia(c,d,e,f,h,k,l,m,n,p,q,r,u,v):a.ia?a.ia(c,d,e,f,h,k,l,m,n,p,q,r,u,v):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r,u,v);var w=gc(z),E=hc(z);if(15===b)return a.ja?a.ja(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):a.ja?a.ja(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w);var z=gc(E),J=hc(E);if(16===b)return a.ka?a.ka(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):a.ka?a.ka(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z);var E=gc(J),
S=hc(J);if(17===b)return a.la?a.la(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E):a.la?a.la(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E);var J=gc(S),ra=hc(S);if(18===b)return a.ma?a.ma(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J):a.ma?a.ma(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J);S=gc(ra);ra=hc(ra);if(19===b)return a.na?a.na(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S):a.na?a.na(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S):a.call(null,c,d,e,f,h,k,
l,m,n,p,q,r,u,v,w,z,E,J,S);var x=gc(ra);hc(ra);if(20===b)return a.oa?a.oa(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S,x):a.oa?a.oa(c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S,x):a.call(null,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S,x);throw Error("Only up to 20 arguments supported on functions");}
var Wb=function Wb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Wb.b(arguments[0],arguments[1]);case 3:return Wb.c(arguments[0],arguments[1],arguments[2]);case 4:return Wb.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Wb.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:return Wb.s(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],new xd(c.slice(5),0))}};
Wb.b=function(a,b){var c=a.A;if(a.J){var d=Ye(b,c+1);return d<=c?bf(a,d,b):a.J(b)}return a.apply(a,ze(b))};Wb.c=function(a,b,c){b=N(b,c);c=a.A;if(a.J){var d=Ye(b,c+1);return d<=c?bf(a,d,b):a.J(b)}return a.apply(a,ze(b))};Wb.m=function(a,b,c,d){b=N(b,N(c,d));c=a.A;return a.J?(d=Ye(b,c+1),d<=c?bf(a,d,b):a.J(b)):a.apply(a,ze(b))};Wb.w=function(a,b,c,d,e){b=N(b,N(c,N(d,e)));c=a.A;return a.J?(d=Ye(b,c+1),d<=c?bf(a,d,b):a.J(b)):a.apply(a,ze(b))};
Wb.s=function(a,b,c,d,e,f){b=N(b,N(c,N(d,N(e,Ze(f)))));c=a.A;return a.J?(d=Ye(b,c+1),d<=c?bf(a,d,b):a.J(b)):a.apply(a,ze(b))};Wb.J=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),e=L(d),d=K(e),f=L(e),e=K(f),f=L(f);return Wb.s(b,a,c,d,e,f)};Wb.A=5;
var cf=function cf(){"undefined"===typeof Bb&&(Bb=function(b,c){this.Ie=b;this.Ge=c;this.i=393216;this.C=0},Bb.prototype.U=function(b,c){return new Bb(this.Ie,c)},Bb.prototype.S=function(){return this.Ge},Bb.prototype.Ba=function(){return!1},Bb.prototype.next=function(){return Error("No such element")},Bb.prototype.remove=function(){return Error("Unsupported operation")},Bb.Jf=function(){return new Q(null,2,5,U,[Md(df,new Hb(null,1,[ef,kd(ff,kd(ce))],null)),Ab.Hf],null)},Bb.sd=!0,Bb.oc="cljs.core/t_cljs$core4908",
Bb.re=function(b){return Lc(b,"cljs.core/t_cljs$core4908")});return new Bb(cf,gf)};hf;function hf(a,b,c,d){this.Gb=a;this.first=b;this.xa=c;this.o=d;this.i=31719628;this.C=0}g=hf.prototype;g.U=function(a,b){return new hf(this.Gb,this.first,this.xa,b)};g.V=function(a,b){return N(b,Fc(this))};g.X=function(){return zd};g.v=function(a,b){return null!=Fc(this)?Ld(this,b):me(b)&&null==I(b)};g.P=function(){return Fd(this)};g.T=function(){null!=this.Gb&&this.Gb.step(this);return null==this.xa?null:this};
g.ca=function(){null!=this.Gb&&Fc(this);return null==this.xa?null:this.first};g.va=function(){null!=this.Gb&&Fc(this);return null==this.xa?zd:this.xa};g.ua=function(){null!=this.Gb&&Fc(this);return null==this.xa?null:Fc(this.xa)};hf.prototype[Ub]=function(){return Bd(this)};function jf(a,b){for(;;){if(null==I(b))return!0;var c;c=K(b);c=a.a?a.a(c):a.call(null,c);if(A(c)){c=a;var d=L(b);a=c;b=d}else return!1}}
function kf(a){for(var b=Be;;)if(I(a)){var c;c=K(a);c=b.a?b.a(c):b.call(null,c);if(A(c))return c;a=L(a)}else return null}var lf=function lf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return lf.B();case 1:return lf.a(arguments[0]);case 2:return lf.b(arguments[0],arguments[1]);case 3:return lf.c(arguments[0],arguments[1],arguments[2]);default:return lf.s(arguments[0],arguments[1],arguments[2],new xd(c.slice(3),0))}};lf.B=function(){return Be};
lf.a=function(a){return a};
lf.b=function(a,b){return function(){function c(c,d,e){c=b.c?b.c(c,d,e):b.call(null,c,d,e);return a.a?a.a(c):a.call(null,c)}function d(c,d){var e=b.b?b.b(c,d):b.call(null,c,d);return a.a?a.a(e):a.call(null,e)}function e(c){c=b.a?b.a(c):b.call(null,c);return a.a?a.a(c):a.call(null,c)}function f(){var c=b.B?b.B():b.call(null);return a.a?a.a(c):a.call(null,c)}var h=null,k=function(){function c(a,b,e,f){var h=null;if(3<arguments.length){for(var h=0,k=Array(arguments.length-3);h<k.length;)k[h]=arguments[h+
3],++h;h=new xd(k,0)}return d.call(this,a,b,e,h)}function d(c,e,f,h){c=Wb.w(b,c,e,f,h);return a.a?a.a(c):a.call(null,c)}c.A=3;c.J=function(a){var b=K(a);a=L(a);var c=K(a);a=L(a);var e=K(a);a=yd(a);return d(b,c,e,a)};c.s=d;return c}(),h=function(a,b,h,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,h);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+
3],++q;q=new xd(r,0)}return k.s(a,b,h,q)}throw Error("Invalid arity: "+arguments.length);};h.A=3;h.J=k.J;h.B=f;h.a=e;h.b=d;h.c=c;h.s=k.s;return h}()};
lf.c=function(a,b,c){return function(){function d(d,e,f){d=c.c?c.c(d,e,f):c.call(null,d,e,f);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function e(d,e){var f;f=c.b?c.b(d,e):c.call(null,d,e);f=b.a?b.a(f):b.call(null,f);return a.a?a.a(f):a.call(null,f)}function f(d){d=c.a?c.a(d):c.call(null,d);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function h(){var d;d=c.B?c.B():c.call(null);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}var k=null,l=function(){function d(a,
b,c,f){var h=null;if(3<arguments.length){for(var h=0,k=Array(arguments.length-3);h<k.length;)k[h]=arguments[h+3],++h;h=new xd(k,0)}return e.call(this,a,b,c,h)}function e(d,f,h,k){d=Wb.w(c,d,f,h,k);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}d.A=3;d.J=function(a){var b=K(a);a=L(a);var c=K(a);a=L(a);var d=K(a);a=yd(a);return e(b,c,d,a)};d.s=e;return d}(),k=function(a,b,c,k){switch(arguments.length){case 0:return h.call(this);case 1:return f.call(this,a);case 2:return e.call(this,a,
b);case 3:return d.call(this,a,b,c);default:var r=null;if(3<arguments.length){for(var r=0,u=Array(arguments.length-3);r<u.length;)u[r]=arguments[r+3],++r;r=new xd(u,0)}return l.s(a,b,c,r)}throw Error("Invalid arity: "+arguments.length);};k.A=3;k.J=l.J;k.B=h;k.a=f;k.b=e;k.c=d;k.s=l.s;return k}()};
lf.s=function(a,b,c,d){return function(a){return function(){function b(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new xd(e,0)}return c.call(this,d)}function c(b){b=Wb.b(K(a),b);for(var d=L(a);;)if(d)b=K(d).call(null,b),d=L(d);else return b}b.A=0;b.J=function(a){a=I(a);return c(a)};b.s=c;return b}()}(Oe(N(a,N(b,N(c,d)))))};lf.J=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),d=L(d);return lf.s(b,a,c,d)};lf.A=3;mf;
function nf(a,b,c,d){this.state=a;this.o=b;this.Ze=c;this.Vd=d;this.C=16386;this.i=6455296}g=nf.prototype;g.equiv=function(a){return this.v(null,a)};g.v=function(a,b){return this===b};g.lc=function(){return this.state};g.S=function(){return this.o};
g.qd=function(a,b,c){a=I(this.Vd);for(var d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);h.m?h.m(k,this,b,c):h.call(null,k,this,b,c);f+=1}else if(a=I(a))re(a)?(d=Wc(a),a=Xc(a),k=d,e=O(d),d=k):(d=K(a),k=P(d,0),h=P(d,1),h.m?h.m(k,this,b,c):h.call(null,k,this,b,c),a=L(a),d=null,e=0),f=0;else return null};g.P=function(){return ja(this)};
var V=function V(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return V.a(arguments[0]);default:return V.s(arguments[0],new xd(c.slice(1),0))}};V.a=function(a){return new nf(a,null,null,null)};V.s=function(a,b){var c=null!=b&&(b.i&64||b.gb)?Wb.b(Jd,b):b,d=H.b(c,Lb),c=H.b(c,of);return new nf(a,d,c,null)};V.J=function(a){var b=K(a);a=L(a);return V.s(b,a)};V.A=1;pf;
function qf(a,b){if(a instanceof nf){var c=a.Ze;if(null!=c&&!A(c.a?c.a(b):c.call(null,b)))throw Error([F("Assert failed: "),F("Validator rejected reference state"),F("\n"),F(function(){var a=kd(rf,sf);return pf.a?pf.a(a):pf.call(null,a)}())].join(""));c=a.state;a.state=b;null!=a.Vd&&Nc(a,c,b);return b}return ad(a,b)}
var tf=function tf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return tf.b(arguments[0],arguments[1]);case 3:return tf.c(arguments[0],arguments[1],arguments[2]);case 4:return tf.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return tf.s(arguments[0],arguments[1],arguments[2],arguments[3],new xd(c.slice(4),0))}};tf.b=function(a,b){var c;a instanceof nf?(c=a.state,c=b.a?b.a(c):b.call(null,c),c=qf(a,c)):c=bd.b(a,b);return c};
tf.c=function(a,b,c){if(a instanceof nf){var d=a.state;b=b.b?b.b(d,c):b.call(null,d,c);a=qf(a,b)}else a=bd.c(a,b,c);return a};tf.m=function(a,b,c,d){if(a instanceof nf){var e=a.state;b=b.c?b.c(e,c,d):b.call(null,e,c,d);a=qf(a,b)}else a=bd.m(a,b,c,d);return a};tf.s=function(a,b,c,d,e){return a instanceof nf?qf(a,Wb.w(b,a.state,c,d,e)):bd.w(a,b,c,d,e)};tf.J=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),e=L(d),d=K(e),e=L(e);return tf.s(b,a,c,d,e)};tf.A=4;
function uf(a){this.state=a;this.i=32768;this.C=0}uf.prototype.lc=function(){return this.state};function mf(a){return new uf(a)}
var He=function He(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return He.a(arguments[0]);case 2:return He.b(arguments[0],arguments[1]);case 3:return He.c(arguments[0],arguments[1],arguments[2]);case 4:return He.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return He.s(arguments[0],arguments[1],arguments[2],arguments[3],new xd(c.slice(4),0))}};
He.a=function(a){return function(b){return function(){function c(c,d){var e=a.a?a.a(d):a.call(null,d);return b.b?b.b(c,e):b.call(null,c,e)}function d(a){return b.a?b.a(a):b.call(null,a)}function e(){return b.B?b.B():b.call(null)}var f=null,h=function(){function c(a,b,e){var f=null;if(2<arguments.length){for(var f=0,h=Array(arguments.length-2);f<h.length;)h[f]=arguments[f+2],++f;f=new xd(h,0)}return d.call(this,a,b,f)}function d(c,e,f){e=Wb.c(a,e,f);return b.b?b.b(c,e):b.call(null,c,e)}c.A=2;c.J=function(a){var b=
K(a);a=L(a);var c=K(a);a=yd(a);return d(b,c,a)};c.s=d;return c}(),f=function(a,b,f){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b);default:var n=null;if(2<arguments.length){for(var n=0,p=Array(arguments.length-2);n<p.length;)p[n]=arguments[n+2],++n;n=new xd(p,0)}return h.s(a,b,n)}throw Error("Invalid arity: "+arguments.length);};f.A=2;f.J=h.J;f.B=e;f.a=d;f.b=c;f.s=h.s;return f}()}};
He.b=function(a,b){return new Se(null,function(){var c=I(b);if(c){if(re(c)){for(var d=Wc(c),e=O(d),f=new Ve(Array(e),0),h=0;;)if(h<e)Xe(f,function(){var b=G.b(d,h);return a.a?a.a(b):a.call(null,b)}()),h+=1;else break;return We(f.Fa(),He.b(a,Xc(c)))}return N(function(){var b=K(c);return a.a?a.a(b):a.call(null,b)}(),He.b(a,yd(c)))}return null},null,null)};
He.c=function(a,b,c){return new Se(null,function(){var d=I(b),e=I(c);if(d&&e){var f=N,h;h=K(d);var k=K(e);h=a.b?a.b(h,k):a.call(null,h,k);d=f(h,He.c(a,yd(d),yd(e)))}else d=null;return d},null,null)};He.m=function(a,b,c,d){return new Se(null,function(){var e=I(b),f=I(c),h=I(d);if(e&&f&&h){var k=N,l;l=K(e);var m=K(f),n=K(h);l=a.c?a.c(l,m,n):a.call(null,l,m,n);e=k(l,He.m(a,yd(e),yd(f),yd(h)))}else e=null;return e},null,null)};
He.s=function(a,b,c,d,e){var f=function k(a){return new Se(null,function(){var b=He.b(I,a);return jf(Be,b)?N(He.b(K,b),k(He.b(yd,b))):null},null,null)};return He.b(function(){return function(b){return Wb.b(a,b)}}(f),f(be.s(e,d,vd([c,b],0))))};He.J=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),e=L(d),d=K(e),e=L(e);return He.s(b,a,c,d,e)};He.A=4;vf;
function wf(a,b){return new Se(null,function(){var c=I(b);if(c){if(re(c)){for(var d=Wc(c),e=O(d),f=new Ve(Array(e),0),h=0;;)if(h<e){var k;k=G.b(d,h);k=a.a?a.a(k):a.call(null,k);A(k)&&(k=G.b(d,h),f.add(k));h+=1}else break;return We(f.Fa(),wf(a,Xc(c)))}d=K(c);c=yd(c);return A(a.a?a.a(d):a.call(null,d))?N(d,wf(a,c)):wf(a,c)}return null},null,null)}
var xf=function xf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return xf.b(arguments[0],arguments[1]);case 3:return xf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};xf.b=function(a,b){return null!=a?null!=a&&(a.C&4||a.ce)?Md($e(Xb.c(Pc,Oc(a),b)),je(a)):Xb.c(bc,a,b):Xb.c(be,zd,b)};
xf.c=function(a,b,c){return null!=a&&(a.C&4||a.ce)?Md($e(Ce(b,af,Oc(a),c)),je(a)):Ce(b,be,a,c)};xf.A=3;function yf(a,b){return $e(Xb.c(function(b,d){return af.b(b,a.a?a.a(d):a.call(null,d))},Oc(ce),b))}function zf(a,b){return $e(Xb.c(function(b,d){return A(a.a?a.a(d):a.call(null,d))?af.b(b,d):b},Oc(ce),b))}
function Af(a,b){var c;a:{c=ue;for(var d=a,e=I(b);;)if(e)if(null!=d?d.i&256||d.od||(d.i?0:C(jc,d)):C(jc,d)){d=H.c(d,K(e),c);if(c===d){c=null;break a}e=L(e)}else{c=null;break a}else{c=d;break a}}return c}var Bf=function Bf(b,c,d){var e=P(c,0);c=Ge(c);return A(c)?ge.c(b,e,Bf(H.b(b,e),c,d)):ge.c(b,e,d)};function Cf(a,b){this.N=a;this.f=b}
function Df(a){return new Cf(a,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null])}function Ef(a){return new Cf(a.N,Vb(a.f))}function Ff(a){a=a.j;return 32>a?0:a-1>>>5<<5}function Gf(a,b,c){for(;;){if(0===b)return c;var d=Df(a);d.f[0]=c;c=d;b-=5}}var Hf=function Hf(b,c,d,e){var f=Ef(d),h=b.j-1>>>c&31;5===c?f.f[h]=e:(d=d.f[h],b=null!=d?Hf(b,c-5,d,e):Gf(null,c-5,e),f.f[h]=b);return f};
function If(a,b){throw Error([F("No item "),F(a),F(" in vector of length "),F(b)].join(""));}function Jf(a,b){if(b>=Ff(a))return a.sa;for(var c=a.root,d=a.shift;;)if(0<d)var e=d-5,c=c.f[b>>>d&31],d=e;else return c.f}function Kf(a,b){return 0<=b&&b<a.j?Jf(a,b):If(b,a.j)}
var Lf=function Lf(b,c,d,e,f){var h=Ef(d);if(0===c)h.f[e&31]=f;else{var k=e>>>c&31;b=Lf(b,c-5,d.f[k],e,f);h.f[k]=b}return h},Mf=function Mf(b,c,d){var e=b.j-2>>>c&31;if(5<c){b=Mf(b,c-5,d.f[e]);if(null==b&&0===e)return null;d=Ef(d);d.f[e]=b;return d}if(0===e)return null;d=Ef(d);d.f[e]=null;return d};function Nf(a,b,c,d,e,f){this.l=a;this.ic=b;this.f=c;this.Ga=d;this.start=e;this.end=f}Nf.prototype.Ba=function(){return this.l<this.end};
Nf.prototype.next=function(){32===this.l-this.ic&&(this.f=Jf(this.Ga,this.l),this.ic+=32);var a=this.f[this.l&31];this.l+=1;return a};Of;Pf;Qf;M;Rf;Sf;Tf;function Q(a,b,c,d,e,f){this.o=a;this.j=b;this.shift=c;this.root=d;this.sa=e;this.u=f;this.i=167668511;this.C=8196}g=Q.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
g.O=function(a,b){return Kf(this,b)[b&31]};g.Aa=function(a,b,c){return 0<=b&&b<this.j?Jf(this,b)[b&31]:c};g.jb=function(a,b,c){if(0<=b&&b<this.j)return Ff(this)<=b?(a=Vb(this.sa),a[b&31]=c,new Q(this.o,this.j,this.shift,this.root,a,null)):new Q(this.o,this.j,this.shift,Lf(this,this.shift,this.root,b,c),this.sa,null);if(b===this.j)return bc(this,c);throw Error([F("Index "),F(b),F(" out of bounds  [0,"),F(this.j),F("]")].join(""));};
g.Sa=function(){var a=this.j;return new Nf(0,0,0<O(this)?Jf(this,0):null,this,0,a)};g.S=function(){return this.o};g.Y=function(){return this.j};g.Ob=function(){return G.b(this,0)};g.Pb=function(){return G.b(this,1)};g.hb=function(){return 0<this.j?G.b(this,this.j-1):null};
g.ib=function(){if(0===this.j)throw Error("Can't pop empty vector");if(1===this.j)return zc(ce,this.o);if(1<this.j-Ff(this))return new Q(this.o,this.j-1,this.shift,this.root,this.sa.slice(0,-1),null);var a=Jf(this,this.j-2),b=Mf(this,this.shift,this.root),b=null==b?U:b,c=this.j-1;return 5<this.shift&&null==b.f[1]?new Q(this.o,c,this.shift-5,b.f[0],a,null):new Q(this.o,c,this.shift,b,a,null)};g.nc=function(){return 0<this.j?new Vd(this,this.j-1,null):null};
g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){if(b instanceof Q)if(this.j===O(b))for(var c=cd(this),d=cd(b);;)if(A(c.Ba())){var e=c.next(),f=d.next();if(!md.b(e,f))return!1}else return!0;else return!1;else return Ld(this,b)};g.wb=function(){return new Qf(this.j,this.shift,Of.a?Of.a(this.root):Of.call(null,this.root),Pf.a?Pf.a(this.sa):Pf.call(null,this.sa))};g.X=function(){return Md(ce,this.o)};g.aa=function(a,b){return Pd(this,b)};
g.ba=function(a,b,c){a=0;for(var d=c;;)if(a<this.j){var e=Jf(this,a);c=e.length;a:for(var f=0;;)if(f<c){var h=e[f],d=b.b?b.b(d,h):b.call(null,d,h);if(Od(d)){e=d;break a}f+=1}else{e=d;break a}if(Od(e))return M.a?M.a(e):M.call(null,e);a+=c;d=e}else return d};g.fb=function(a,b,c){if("number"===typeof b)return vc(this,b,c);throw Error("Vector's key for assoc must be a number.");};
g.T=function(){if(0===this.j)return null;if(32>=this.j)return new xd(this.sa,0);var a;a:{a=this.root;for(var b=this.shift;;)if(0<b)b-=5,a=a.f[0];else{a=a.f;break a}}return Tf.m?Tf.m(this,a,0,0):Tf.call(null,this,a,0,0)};g.U=function(a,b){return new Q(b,this.j,this.shift,this.root,this.sa,this.u)};
g.V=function(a,b){if(32>this.j-Ff(this)){for(var c=this.sa.length,d=Array(c+1),e=0;;)if(e<c)d[e]=this.sa[e],e+=1;else break;d[c]=b;return new Q(this.o,this.j+1,this.shift,this.root,d,null)}c=(d=this.j>>>5>1<<this.shift)?this.shift+5:this.shift;d?(d=Df(null),d.f[0]=this.root,e=Gf(null,this.shift,new Cf(null,this.sa)),d.f[1]=e):d=Hf(this,this.shift,this.root,new Cf(null,this.sa));return new Q(this.o,this.j+1,c,d,[b],null)};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.Aa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.Aa(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.O(null,a)};g.b=function(a,b){return this.Aa(null,a,b)};
var U=new Cf(null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]),ce=new Q(null,0,5,U,[],Gd);Q.prototype[Ub]=function(){return Bd(this)};function Ae(a){if(Qb(a))a:{var b=a.length;if(32>b)a=new Q(null,b,5,U,a,null);else for(var c=32,d=(new Q(null,32,5,U,a.slice(0,32),null)).wb(null);;)if(c<b)var e=c+1,d=af.b(d,a[c]),c=e;else{a=Qc(d);break a}}else a=Qc(Xb.c(Pc,Oc(ce),a));return a}Uf;
function qe(a,b,c,d,e,f){this.Ea=a;this.node=b;this.l=c;this.da=d;this.o=e;this.u=f;this.i=32375020;this.C=1536}g=qe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};g.ua=function(){if(this.da+1<this.node.length){var a;a=this.Ea;var b=this.node,c=this.l,d=this.da+1;a=Tf.m?Tf.m(a,b,c,d):Tf.call(null,a,b,c,d);return null==a?null:a}return Yc(this)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};
g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(ce,this.o)};g.aa=function(a,b){var c;c=this.Ea;var d=this.l+this.da,e=O(this.Ea);c=Uf.c?Uf.c(c,d,e):Uf.call(null,c,d,e);return Pd(c,b)};g.ba=function(a,b,c){a=this.Ea;var d=this.l+this.da,e=O(this.Ea);a=Uf.c?Uf.c(a,d,e):Uf.call(null,a,d,e);return Qd(a,b,c)};g.ca=function(){return this.node[this.da]};
g.va=function(){if(this.da+1<this.node.length){var a;a=this.Ea;var b=this.node,c=this.l,d=this.da+1;a=Tf.m?Tf.m(a,b,c,d):Tf.call(null,a,b,c,d);return null==a?zd:a}return Xc(this)};g.T=function(){return this};g.Qc=function(){var a=this.node;return new Ue(a,this.da,a.length)};g.Rc=function(){var a=this.l+this.node.length;if(a<Zb(this.Ea)){var b=this.Ea,c=Jf(this.Ea,a);return Tf.m?Tf.m(b,c,a,0):Tf.call(null,b,c,a,0)}return zd};
g.U=function(a,b){return Tf.w?Tf.w(this.Ea,this.node,this.l,this.da,b):Tf.call(null,this.Ea,this.node,this.l,this.da,b)};g.V=function(a,b){return N(b,this)};g.Pc=function(){var a=this.l+this.node.length;if(a<Zb(this.Ea)){var b=this.Ea,c=Jf(this.Ea,a);return Tf.m?Tf.m(b,c,a,0):Tf.call(null,b,c,a,0)}return null};qe.prototype[Ub]=function(){return Bd(this)};
var Tf=function Tf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Tf.c(arguments[0],arguments[1],arguments[2]);case 4:return Tf.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Tf.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Tf.c=function(a,b,c){return new qe(a,Kf(a,b),b,c,null,null)};
Tf.m=function(a,b,c,d){return new qe(a,b,c,d,null,null)};Tf.w=function(a,b,c,d,e){return new qe(a,b,c,d,e,null)};Tf.A=5;Vf;function Wf(a,b,c,d,e){this.o=a;this.Ga=b;this.start=c;this.end=d;this.u=e;this.i=167666463;this.C=8192}g=Wf.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
g.O=function(a,b){return 0>b||this.end<=this.start+b?If(b,this.end-this.start):G.b(this.Ga,this.start+b)};g.Aa=function(a,b,c){return 0>b||this.end<=this.start+b?c:G.c(this.Ga,this.start+b,c)};g.jb=function(a,b,c){var d=this.start+b;a=this.o;c=ge.c(this.Ga,d,c);b=this.start;var e=this.end,d=d+1,d=e>d?e:d;return Vf.w?Vf.w(a,c,b,d,null):Vf.call(null,a,c,b,d,null)};g.S=function(){return this.o};g.Y=function(){return this.end-this.start};g.hb=function(){return G.b(this.Ga,this.end-1)};
g.ib=function(){if(this.start===this.end)throw Error("Can't pop empty vector");var a=this.o,b=this.Ga,c=this.start,d=this.end-1;return Vf.w?Vf.w(a,b,c,d,null):Vf.call(null,a,b,c,d,null)};g.nc=function(){return this.start!==this.end?new Vd(this,this.end-this.start-1,null):null};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(ce,this.o)};g.aa=function(a,b){return Pd(this,b)};g.ba=function(a,b,c){return Qd(this,b,c)};
g.fb=function(a,b,c){if("number"===typeof b)return vc(this,b,c);throw Error("Subvec's key for assoc must be a number.");};g.T=function(){var a=this;return function(b){return function d(e){return e===a.end?null:N(G.b(a.Ga,e),new Se(null,function(){return function(){return d(e+1)}}(b),null,null))}}(this)(a.start)};g.U=function(a,b){return Vf.w?Vf.w(b,this.Ga,this.start,this.end,this.u):Vf.call(null,b,this.Ga,this.start,this.end,this.u)};
g.V=function(a,b){var c=this.o,d=vc(this.Ga,this.end,b),e=this.start,f=this.end+1;return Vf.w?Vf.w(c,d,e,f,null):Vf.call(null,c,d,e,f,null)};g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.Aa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.Aa(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.a=function(a){return this.O(null,a)};g.b=function(a,b){return this.Aa(null,a,b)};Wf.prototype[Ub]=function(){return Bd(this)};function Vf(a,b,c,d,e){for(;;)if(b instanceof Wf)c=b.start+c,d=b.start+d,b=b.Ga;else{var f=O(b);if(0>c||0>d||c>f||d>f)throw Error("Index out of bounds");return new Wf(a,b,c,d,e)}}
var Uf=function Uf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Uf.b(arguments[0],arguments[1]);case 3:return Uf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Uf.b=function(a,b){return Uf.c(a,b,O(a))};Uf.c=function(a,b,c){return Vf(null,a,b,c,null)};Uf.A=3;function Xf(a,b){return a===b.N?b:new Cf(a,Vb(b.f))}function Of(a){return new Cf({},Vb(a.f))}
function Pf(a){var b=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];te(a,0,b,0,a.length);return b}var Yf=function Yf(b,c,d,e){d=Xf(b.root.N,d);var f=b.j-1>>>c&31;if(5===c)b=e;else{var h=d.f[f];b=null!=h?Yf(b,c-5,h,e):Gf(b.root.N,c-5,e)}d.f[f]=b;return d};function Qf(a,b,c,d){this.j=a;this.shift=b;this.root=c;this.sa=d;this.C=88;this.i=275}g=Qf.prototype;
g.Tb=function(a,b){if(this.root.N){if(32>this.j-Ff(this))this.sa[this.j&31]=b;else{var c=new Cf(this.root.N,this.sa),d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];d[0]=b;this.sa=d;if(this.j>>>5>1<<this.shift){var d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],e=this.shift+
5;d[0]=this.root;d[1]=Gf(this.root.N,this.shift,c);this.root=new Cf(this.root.N,d);this.shift=e}else this.root=Yf(this,this.shift,this.root,c)}this.j+=1;return this}throw Error("conj! after persistent!");};g.Ub=function(){if(this.root.N){this.root.N=null;var a=this.j-Ff(this),b=Array(a);te(this.sa,0,b,0,a);return new Q(null,this.j,this.shift,this.root,b,null)}throw Error("persistent! called twice");};
g.Sb=function(a,b,c){if("number"===typeof b)return Sc(this,b,c);throw Error("TransientVector's key for assoc! must be a number.");};
g.pd=function(a,b,c){var d=this;if(d.root.N){if(0<=b&&b<d.j)return Ff(this)<=b?d.sa[b&31]=c:(a=function(){return function f(a,k){var l=Xf(d.root.N,k);if(0===a)l.f[b&31]=c;else{var m=b>>>a&31,n=f(a-5,l.f[m]);l.f[m]=n}return l}}(this).call(null,d.shift,d.root),d.root=a),this;if(b===d.j)return Pc(this,c);throw Error([F("Index "),F(b),F(" out of bounds for TransientVector of length"),F(d.j)].join(""));}throw Error("assoc! after persistent!");};
g.Y=function(){if(this.root.N)return this.j;throw Error("count after persistent!");};g.O=function(a,b){if(this.root.N)return Kf(this,b)[b&31];throw Error("nth after persistent!");};g.Aa=function(a,b,c){return 0<=b&&b<this.j?G.b(this,b):c};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.G(null,a,b)};function $f(){this.i=2097152;this.C=0}
$f.prototype.equiv=function(a){return this.v(null,a)};$f.prototype.v=function(){return!1};var ag=new $f;function bg(a,b){return we(ne(b)?O(a)===O(b)?jf(Be,He.b(function(a){return md.b(H.c(b,K(a),ag),ae(a))},a)):null:null)}function cg(a){this.D=a}cg.prototype.next=function(){if(null!=this.D){var a=K(this.D),b=P(a,0),a=P(a,1);this.D=L(this.D);return{value:[b,a],done:!1}}return{value:null,done:!0}};function dg(a){return new cg(I(a))}function eg(a){this.D=a}
eg.prototype.next=function(){if(null!=this.D){var a=K(this.D);this.D=L(this.D);return{value:[a,a],done:!1}}return{value:null,done:!0}};
function fg(a,b){var c;if(b instanceof B)a:{c=a.length;for(var d=b.Oa,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof B&&d===a[e].Oa){c=e;break a}e+=2}}else if(fa(b)||"number"===typeof b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(b===a[d]){c=d;break a}d+=2}else if(b instanceof ld)a:for(c=a.length,d=b.Ra,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof ld&&d===a[e].Ra){c=e;break a}e+=2}else if(null==b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(null==a[d]){c=d;break a}d+=2}else a:for(c=a.length,
d=0;;){if(c<=d){c=-1;break a}if(md.b(b,a[d])){c=d;break a}d+=2}return c}gg;function hg(a,b,c){this.f=a;this.l=b;this.ya=c;this.i=32374990;this.C=0}g=hg.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.ya};g.ua=function(){return this.l<this.f.length-2?new hg(this.f,this.l+2,this.ya):null};g.Y=function(){return(this.f.length-this.l)/2};g.P=function(){return Fd(this)};g.v=function(a,b){return Ld(this,b)};
g.X=function(){return Md(zd,this.ya)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return new Q(null,2,5,U,[this.f[this.l],this.f[this.l+1]],null)};g.va=function(){return this.l<this.f.length-2?new hg(this.f,this.l+2,this.ya):zd};g.T=function(){return this};g.U=function(a,b){return new hg(this.f,this.l,b)};g.V=function(a,b){return N(b,this)};hg.prototype[Ub]=function(){return Bd(this)};ig;jg;function kg(a,b,c){this.f=a;this.l=b;this.j=c}
kg.prototype.Ba=function(){return this.l<this.j};kg.prototype.next=function(){var a=new Q(null,2,5,U,[this.f[this.l],this.f[this.l+1]],null);this.l+=2;return a};function Hb(a,b,c,d){this.o=a;this.j=b;this.f=c;this.u=d;this.i=16647951;this.C=8196}g=Hb.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.keys=function(){return Bd(ig.a?ig.a(this):ig.call(null,this))};g.entries=function(){return dg(I(this))};
g.values=function(){return Bd(jg.a?jg.a(this):jg.call(null,this))};g.has=function(a){return xe(this,a)};g.get=function(a,b){return this.G(null,a,b)};g.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),h=P(f,0),f=P(f,1);a.b?a.b(f,h):a.call(null,f,h);e+=1}else if(b=I(b))re(b)?(c=Wc(b),b=Xc(b),h=c,d=O(c),c=h):(c=K(b),h=P(c,0),f=P(c,1),a.b?a.b(f,h):a.call(null,f,h),b=L(b),c=null,d=0),e=0;else return null};g.L=function(a,b){return kc.c(this,b,null)};
g.G=function(a,b,c){a=fg(this.f,b);return-1===a?c:this.f[a+1]};g.Sa=function(){return new kg(this.f,0,2*this.j)};g.S=function(){return this.o};g.Y=function(){return this.j};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Hd(this)};g.v=function(a,b){if(null!=b&&(b.i&1024||b.ge)){var c=this.f.length;if(this.j===b.Y(null))for(var d=0;;)if(d<c){var e=b.G(null,this.f[d],ue);if(e!==ue)if(md.b(this.f[d+1],e))d+=2;else return!1;else return!1}else return!0;else return!1}else return bg(this,b)};
g.wb=function(){return new gg({},this.f.length,Vb(this.f))};g.X=function(){return zc(gf,this.o)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.fb=function(a,b,c){a=fg(this.f,b);if(-1===a){if(this.j<lg){a=this.f;for(var d=a.length,e=Array(d+2),f=0;;)if(f<d)e[f]=a[f],f+=1;else break;e[d]=b;e[d+1]=c;return new Hb(this.o,this.j+1,e,null)}return zc(mc(xf.b(he,this),b,c),this.o)}if(c===this.f[a+1])return this;b=Vb(this.f);b[a+1]=c;return new Hb(this.o,this.j,b,null)};
g.Oc=function(a,b){return-1!==fg(this.f,b)};g.T=function(){var a=this.f;return 0<=a.length-2?new hg(a,0,null):null};g.U=function(a,b){return new Hb(b,this.j,this.f,this.u)};g.V=function(a,b){if(oe(b))return mc(this,G.b(b,0),G.b(b,1));for(var c=this,d=I(b);;){if(null==d)return c;var e=K(d);if(oe(e))c=mc(c,G.b(e,0),G.b(e,1)),d=L(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.G(null,a,b)};var gf=new Hb(null,0,[],Id),lg=8;Hb.prototype[Ub]=function(){return Bd(this)};
mg;function gg(a,b,c){this.zb=a;this.qb=b;this.f=c;this.i=258;this.C=56}g=gg.prototype;g.Y=function(){if(A(this.zb))return Ee(this.qb);throw Error("count after persistent!");};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){if(A(this.zb))return a=fg(this.f,b),-1===a?c:this.f[a+1];throw Error("lookup after persistent!");};
g.Tb=function(a,b){if(A(this.zb)){if(null!=b?b.i&2048||b.he||(b.i?0:C(oc,b)):C(oc,b))return Rc(this,Je.a?Je.a(b):Je.call(null,b),Ke.a?Ke.a(b):Ke.call(null,b));for(var c=I(b),d=this;;){var e=K(c);if(A(e))c=L(c),d=Rc(d,Je.a?Je.a(e):Je.call(null,e),Ke.a?Ke.a(e):Ke.call(null,e));else return d}}else throw Error("conj! after persistent!");};g.Ub=function(){if(A(this.zb))return this.zb=!1,new Hb(null,Ee(this.qb),this.f,null);throw Error("persistent! called twice");};
g.Sb=function(a,b,c){if(A(this.zb)){a=fg(this.f,b);if(-1===a){if(this.qb+2<=2*lg)return this.qb+=2,this.f.push(b),this.f.push(c),this;a=mg.b?mg.b(this.qb,this.f):mg.call(null,this.qb,this.f);return Rc(a,b,c)}c!==this.f[a+1]&&(this.f[a+1]=c);return this}throw Error("assoc! after persistent!");};ng;fe;function mg(a,b){for(var c=Oc(he),d=0;;)if(d<a)c=Rc(c,b[d],b[d+1]),d+=2;else return c}function og(){this.K=!1}pg;qg;qf;rg;V;M;
function sg(a,b){return a===b?!0:a===b||a instanceof B&&b instanceof B&&a.Oa===b.Oa?!0:md.b(a,b)}function tg(a,b,c){a=Vb(a);a[b]=c;return a}function ug(a,b,c,d){a=a.mb(b);a.f[c]=d;return a}vg;function wg(a,b,c,d){this.f=a;this.l=b;this.bc=c;this.La=d}wg.prototype.advance=function(){for(var a=this.f.length;;)if(this.l<a){var b=this.f[this.l],c=this.f[this.l+1];null!=b?b=this.bc=new Q(null,2,5,U,[b,c],null):null!=c?(b=cd(c),b=b.Ba()?this.La=b:!1):b=!1;this.l+=2;if(b)return!0}else return!1};
wg.prototype.Ba=function(){var a=null!=this.bc;return a?a:(a=null!=this.La)?a:this.advance()};wg.prototype.next=function(){if(null!=this.bc){var a=this.bc;this.bc=null;return a}if(null!=this.La)return a=this.La.next(),this.La.Ba()||(this.La=null),a;if(this.advance())return this.next();throw Error("No such element");};wg.prototype.remove=function(){return Error("Unsupported operation")};function xg(a,b,c){this.N=a;this.Z=b;this.f=c}g=xg.prototype;
g.mb=function(a){if(a===this.N)return this;var b=Fe(this.Z),c=Array(0>b?4:2*(b+1));te(this.f,0,c,0,2*b);return new xg(a,this.Z,c)};g.Yb=function(){return pg.a?pg.a(this.f):pg.call(null,this.f)};g.bb=function(a,b,c,d){var e=1<<(b>>>a&31);if(0===(this.Z&e))return d;var f=Fe(this.Z&e-1),e=this.f[2*f],f=this.f[2*f+1];return null==e?f.bb(a+5,b,c,d):sg(c,e)?f:d};
g.Ja=function(a,b,c,d,e,f){var h=1<<(c>>>b&31),k=Fe(this.Z&h-1);if(0===(this.Z&h)){var l=Fe(this.Z);if(2*l<this.f.length){a=this.mb(a);b=a.f;f.K=!0;a:for(c=2*(l-k),f=2*k+(c-1),l=2*(k+1)+(c-1);;){if(0===c)break a;b[l]=b[f];--l;--c;--f}b[2*k]=d;b[2*k+1]=e;a.Z|=h;return a}if(16<=l){k=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];k[c>>>b&31]=yg.Ja(a,b+5,c,d,e,f);for(e=d=0;;)if(32>d)0!==
(this.Z>>>d&1)&&(k[d]=null!=this.f[e]?yg.Ja(a,b+5,rd(this.f[e]),this.f[e],this.f[e+1],f):this.f[e+1],e+=2),d+=1;else break;return new vg(a,l+1,k)}b=Array(2*(l+4));te(this.f,0,b,0,2*k);b[2*k]=d;b[2*k+1]=e;te(this.f,2*k,b,2*(k+1),2*(l-k));f.K=!0;a=this.mb(a);a.f=b;a.Z|=h;return a}l=this.f[2*k];h=this.f[2*k+1];if(null==l)return l=h.Ja(a,b+5,c,d,e,f),l===h?this:ug(this,a,2*k+1,l);if(sg(d,l))return e===h?this:ug(this,a,2*k+1,e);f.K=!0;f=b+5;d=rg.W?rg.W(a,f,l,h,c,d,e):rg.call(null,a,f,l,h,c,d,e);e=2*k;
k=2*k+1;a=this.mb(a);a.f[e]=null;a.f[k]=d;return a};
g.Ia=function(a,b,c,d,e){var f=1<<(b>>>a&31),h=Fe(this.Z&f-1);if(0===(this.Z&f)){var k=Fe(this.Z);if(16<=k){h=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];h[b>>>a&31]=yg.Ia(a+5,b,c,d,e);for(d=c=0;;)if(32>c)0!==(this.Z>>>c&1)&&(h[c]=null!=this.f[d]?yg.Ia(a+5,rd(this.f[d]),this.f[d],this.f[d+1],e):this.f[d+1],d+=2),c+=1;else break;return new vg(null,k+1,h)}a=Array(2*(k+1));te(this.f,
0,a,0,2*h);a[2*h]=c;a[2*h+1]=d;te(this.f,2*h,a,2*(h+1),2*(k-h));e.K=!0;return new xg(null,this.Z|f,a)}var l=this.f[2*h],f=this.f[2*h+1];if(null==l)return k=f.Ia(a+5,b,c,d,e),k===f?this:new xg(null,this.Z,tg(this.f,2*h+1,k));if(sg(c,l))return d===f?this:new xg(null,this.Z,tg(this.f,2*h+1,d));e.K=!0;e=this.Z;k=this.f;a+=5;a=rg.I?rg.I(a,l,f,b,c,d):rg.call(null,a,l,f,b,c,d);c=2*h;h=2*h+1;d=Vb(k);d[c]=null;d[h]=a;return new xg(null,e,d)};g.Sa=function(){return new wg(this.f,0,null,null)};
var yg=new xg(null,0,[]);function zg(a,b,c){this.f=a;this.l=b;this.La=c}zg.prototype.Ba=function(){for(var a=this.f.length;;){if(null!=this.La&&this.La.Ba())return!0;if(this.l<a){var b=this.f[this.l];this.l+=1;null!=b&&(this.La=cd(b))}else return!1}};zg.prototype.next=function(){if(this.Ba())return this.La.next();throw Error("No such element");};zg.prototype.remove=function(){return Error("Unsupported operation")};function vg(a,b,c){this.N=a;this.j=b;this.f=c}g=vg.prototype;
g.mb=function(a){return a===this.N?this:new vg(a,this.j,Vb(this.f))};g.Yb=function(){return qg.a?qg.a(this.f):qg.call(null,this.f)};g.bb=function(a,b,c,d){var e=this.f[b>>>a&31];return null!=e?e.bb(a+5,b,c,d):d};g.Ja=function(a,b,c,d,e,f){var h=c>>>b&31,k=this.f[h];if(null==k)return a=ug(this,a,h,yg.Ja(a,b+5,c,d,e,f)),a.j+=1,a;b=k.Ja(a,b+5,c,d,e,f);return b===k?this:ug(this,a,h,b)};
g.Ia=function(a,b,c,d,e){var f=b>>>a&31,h=this.f[f];if(null==h)return new vg(null,this.j+1,tg(this.f,f,yg.Ia(a+5,b,c,d,e)));a=h.Ia(a+5,b,c,d,e);return a===h?this:new vg(null,this.j,tg(this.f,f,a))};g.Sa=function(){return new zg(this.f,0,null)};function Ag(a,b,c){b*=2;for(var d=0;;)if(d<b){if(sg(c,a[d]))return d;d+=2}else return-1}function Bg(a,b,c,d){this.N=a;this.$a=b;this.j=c;this.f=d}g=Bg.prototype;
g.mb=function(a){if(a===this.N)return this;var b=Array(2*(this.j+1));te(this.f,0,b,0,2*this.j);return new Bg(a,this.$a,this.j,b)};g.Yb=function(){return pg.a?pg.a(this.f):pg.call(null,this.f)};g.bb=function(a,b,c,d){a=Ag(this.f,this.j,c);return 0>a?d:sg(c,this.f[a])?this.f[a+1]:d};
g.Ja=function(a,b,c,d,e,f){if(c===this.$a){b=Ag(this.f,this.j,d);if(-1===b){if(this.f.length>2*this.j)return b=2*this.j,c=2*this.j+1,a=this.mb(a),a.f[b]=d,a.f[c]=e,f.K=!0,a.j+=1,a;c=this.f.length;b=Array(c+2);te(this.f,0,b,0,c);b[c]=d;b[c+1]=e;f.K=!0;d=this.j+1;a===this.N?(this.f=b,this.j=d,a=this):a=new Bg(this.N,this.$a,d,b);return a}return this.f[b+1]===e?this:ug(this,a,b+1,e)}return(new xg(a,1<<(this.$a>>>b&31),[null,this,null,null])).Ja(a,b,c,d,e,f)};
g.Ia=function(a,b,c,d,e){return b===this.$a?(a=Ag(this.f,this.j,c),-1===a?(a=2*this.j,b=Array(a+2),te(this.f,0,b,0,a),b[a]=c,b[a+1]=d,e.K=!0,new Bg(null,this.$a,this.j+1,b)):md.b(this.f[a],d)?this:new Bg(null,this.$a,this.j,tg(this.f,a+1,d))):(new xg(null,1<<(this.$a>>>a&31),[null,this])).Ia(a,b,c,d,e)};g.Sa=function(){return new wg(this.f,0,null,null)};
var rg=function rg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 6:return rg.I(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);case 7:return rg.W(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5],arguments[6]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
rg.I=function(a,b,c,d,e,f){var h=rd(b);if(h===d)return new Bg(null,h,2,[b,c,e,f]);var k=new og;return yg.Ia(a,h,b,c,k).Ia(a,d,e,f,k)};rg.W=function(a,b,c,d,e,f,h){var k=rd(c);if(k===e)return new Bg(null,k,2,[c,d,f,h]);var l=new og;return yg.Ja(a,b,k,c,d,l).Ja(a,b,e,f,h,l)};rg.A=7;function Cg(a,b,c,d,e){this.o=a;this.cb=b;this.l=c;this.D=d;this.u=e;this.i=32374860;this.C=0}g=Cg.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};
g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.o)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return null==this.D?new Q(null,2,5,U,[this.cb[this.l],this.cb[this.l+1]],null):K(this.D)};
g.va=function(){if(null==this.D){var a=this.cb,b=this.l+2;return pg.c?pg.c(a,b,null):pg.call(null,a,b,null)}var a=this.cb,b=this.l,c=L(this.D);return pg.c?pg.c(a,b,c):pg.call(null,a,b,c)};g.T=function(){return this};g.U=function(a,b){return new Cg(b,this.cb,this.l,this.D,this.u)};g.V=function(a,b){return N(b,this)};Cg.prototype[Ub]=function(){return Bd(this)};
var pg=function pg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return pg.a(arguments[0]);case 3:return pg.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};pg.a=function(a){return pg.c(a,0,null)};
pg.c=function(a,b,c){if(null==c)for(c=a.length;;)if(b<c){if(null!=a[b])return new Cg(null,a,b,null,null);var d=a[b+1];if(A(d)&&(d=d.Yb(),A(d)))return new Cg(null,a,b+2,d,null);b+=2}else return null;else return new Cg(null,a,b,c,null)};pg.A=3;function Dg(a,b,c,d,e){this.o=a;this.cb=b;this.l=c;this.D=d;this.u=e;this.i=32374860;this.C=0}g=Dg.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.o};
g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.o)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return K(this.D)};g.va=function(){var a=this.cb,b=this.l,c=L(this.D);return qg.m?qg.m(null,a,b,c):qg.call(null,null,a,b,c)};g.T=function(){return this};g.U=function(a,b){return new Dg(b,this.cb,this.l,this.D,this.u)};g.V=function(a,b){return N(b,this)};
Dg.prototype[Ub]=function(){return Bd(this)};var qg=function qg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return qg.a(arguments[0]);case 4:return qg.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};qg.a=function(a){return qg.m(null,a,0,null)};
qg.m=function(a,b,c,d){if(null==d)for(d=b.length;;)if(c<d){var e=b[c];if(A(e)&&(e=e.Yb(),A(e)))return new Dg(a,b,c+1,e,null);c+=1}else return null;else return new Dg(a,b,c,d,null)};qg.A=4;ng;function Eg(a,b,c){this.Da=a;this.Rd=b;this.bd=c}Eg.prototype.Ba=function(){return this.bd&&this.Rd.Ba()};Eg.prototype.next=function(){if(this.bd)return this.Rd.next();this.bd=!0;return this.Da};Eg.prototype.remove=function(){return Error("Unsupported operation")};
function fe(a,b,c,d,e,f){this.o=a;this.j=b;this.root=c;this.Ca=d;this.Da=e;this.u=f;this.i=16123663;this.C=8196}g=fe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.keys=function(){return Bd(ig.a?ig.a(this):ig.call(null,this))};g.entries=function(){return dg(I(this))};g.values=function(){return Bd(jg.a?jg.a(this):jg.call(null,this))};g.has=function(a){return xe(this,a)};g.get=function(a,b){return this.G(null,a,b)};
g.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),h=P(f,0),f=P(f,1);a.b?a.b(f,h):a.call(null,f,h);e+=1}else if(b=I(b))re(b)?(c=Wc(b),b=Xc(b),h=c,d=O(c),c=h):(c=K(b),h=P(c,0),f=P(c,1),a.b?a.b(f,h):a.call(null,f,h),b=L(b),c=null,d=0),e=0;else return null};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){return null==b?this.Ca?this.Da:c:null==this.root?c:this.root.bb(0,rd(b),b,c)};
g.Sa=function(){var a=this.root?cd(this.root):cf;return this.Ca?new Eg(this.Da,a,!1):a};g.S=function(){return this.o};g.Y=function(){return this.j};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Hd(this)};g.v=function(a,b){return bg(this,b)};g.wb=function(){return new ng({},this.root,this.j,this.Ca,this.Da)};g.X=function(){return zc(he,this.o)};
g.fb=function(a,b,c){if(null==b)return this.Ca&&c===this.Da?this:new fe(this.o,this.Ca?this.j:this.j+1,this.root,!0,c,null);a=new og;b=(null==this.root?yg:this.root).Ia(0,rd(b),b,c,a);return b===this.root?this:new fe(this.o,a.K?this.j+1:this.j,b,this.Ca,this.Da,null)};g.Oc=function(a,b){return null==b?this.Ca:null==this.root?!1:this.root.bb(0,rd(b),b,ue)!==ue};g.T=function(){if(0<this.j){var a=null!=this.root?this.root.Yb():null;return this.Ca?N(new Q(null,2,5,U,[null,this.Da],null),a):a}return null};
g.U=function(a,b){return new fe(b,this.j,this.root,this.Ca,this.Da,this.u)};g.V=function(a,b){if(oe(b))return mc(this,G.b(b,0),G.b(b,1));for(var c=this,d=I(b);;){if(null==d)return c;var e=K(d);if(oe(e))c=mc(c,G.b(e,0),G.b(e,1)),d=L(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.G(null,a,b)};var he=new fe(null,0,null,!1,null,Id);fe.prototype[Ub]=function(){return Bd(this)};
function ng(a,b,c,d,e){this.N=a;this.root=b;this.count=c;this.Ca=d;this.Da=e;this.i=258;this.C=56}function Fg(a,b,c){if(a.N){if(null==b)a.Da!==c&&(a.Da=c),a.Ca||(a.count+=1,a.Ca=!0);else{var d=new og;b=(null==a.root?yg:a.root).Ja(a.N,0,rd(b),b,c,d);b!==a.root&&(a.root=b);d.K&&(a.count+=1)}return a}throw Error("assoc! after persistent!");}g=ng.prototype;g.Y=function(){if(this.N)return this.count;throw Error("count after persistent!");};
g.L=function(a,b){return null==b?this.Ca?this.Da:null:null==this.root?null:this.root.bb(0,rd(b),b)};g.G=function(a,b,c){return null==b?this.Ca?this.Da:c:null==this.root?c:this.root.bb(0,rd(b),b,c)};
g.Tb=function(a,b){var c;a:if(this.N)if(null!=b?b.i&2048||b.he||(b.i?0:C(oc,b)):C(oc,b))c=Fg(this,Je.a?Je.a(b):Je.call(null,b),Ke.a?Ke.a(b):Ke.call(null,b));else{c=I(b);for(var d=this;;){var e=K(c);if(A(e))c=L(c),d=Fg(d,Je.a?Je.a(e):Je.call(null,e),Ke.a?Ke.a(e):Ke.call(null,e));else{c=d;break a}}}else throw Error("conj! after persistent");return c};g.Ub=function(){var a;if(this.N)this.N=null,a=new fe(null,this.count,this.root,this.Ca,this.Da,null);else throw Error("persistent! called twice");return a};
g.Sb=function(a,b,c){return Fg(this,b,c)};Gg;Hg;function Hg(a,b,c,d,e){this.key=a;this.K=b;this.left=c;this.right=d;this.u=e;this.i=32402207;this.C=0}g=Hg.prototype;g.replace=function(a,b,c,d){return new Hg(a,b,c,d,null)};g.L=function(a,b){return G.c(this,b,null)};g.G=function(a,b,c){return G.c(this,b,c)};g.O=function(a,b){return 0===b?this.key:1===b?this.K:null};g.Aa=function(a,b,c){return 0===b?this.key:1===b?this.K:c};
g.jb=function(a,b,c){return(new Q(null,2,5,U,[this.key,this.K],null)).jb(null,b,c)};g.S=function(){return null};g.Y=function(){return 2};g.Ob=function(){return this.key};g.Pb=function(){return this.K};g.hb=function(){return this.K};g.ib=function(){return new Q(null,1,5,U,[this.key],null)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return ce};g.aa=function(a,b){return Pd(this,b)};g.ba=function(a,b,c){return Qd(this,b,c)};
g.fb=function(a,b,c){return ge.c(new Q(null,2,5,U,[this.key,this.K],null),b,c)};g.T=function(){return bc(bc(zd,this.K),this.key)};g.U=function(a,b){return Md(new Q(null,2,5,U,[this.key,this.K],null),b)};g.V=function(a,b){return new Q(null,3,5,U,[this.key,this.K,b],null)};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.G(null,a,b)};Hg.prototype[Ub]=function(){return Bd(this)};
function Gg(a,b,c,d,e){this.key=a;this.K=b;this.left=c;this.right=d;this.u=e;this.i=32402207;this.C=0}g=Gg.prototype;g.replace=function(a,b,c,d){return new Gg(a,b,c,d,null)};g.L=function(a,b){return G.c(this,b,null)};g.G=function(a,b,c){return G.c(this,b,c)};g.O=function(a,b){return 0===b?this.key:1===b?this.K:null};g.Aa=function(a,b,c){return 0===b?this.key:1===b?this.K:c};g.jb=function(a,b,c){return(new Q(null,2,5,U,[this.key,this.K],null)).jb(null,b,c)};g.S=function(){return null};g.Y=function(){return 2};
g.Ob=function(){return this.key};g.Pb=function(){return this.K};g.hb=function(){return this.K};g.ib=function(){return new Q(null,1,5,U,[this.key],null)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return ce};g.aa=function(a,b){return Pd(this,b)};g.ba=function(a,b,c){return Qd(this,b,c)};g.fb=function(a,b,c){return ge.c(new Q(null,2,5,U,[this.key,this.K],null),b,c)};g.T=function(){return bc(bc(zd,this.K),this.key)};
g.U=function(a,b){return Md(new Q(null,2,5,U,[this.key,this.K],null),b)};g.V=function(a,b){return new Q(null,3,5,U,[this.key,this.K,b],null)};g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.G(null,a,b)};Gg.prototype[Ub]=function(){return Bd(this)};Je;var Jd=function Jd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Jd.s(0<c.length?new xd(c.slice(0),0):null)};Jd.s=function(a){for(var b=I(a),c=Oc(he);;)if(b){a=L(L(b));var d=K(b),b=ae(b),c=Rc(c,d,b),b=a}else return Qc(c)};Jd.A=0;Jd.J=function(a){return Jd.s(I(a))};
var Ig=function Ig(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Ig.s(0<c.length?new xd(c.slice(0),0):null)};Ig.s=function(a){a=a instanceof xd&&0===a.l?a.f:Ob.a(a);for(var b=[],c=0;;)if(c<a.length){var d=a[c],e=a[c+1];-1===fg(b,d)&&(b.push(d),b.push(e));c+=2}else break;return new Hb(null,b.length/2,b,null)};Ig.A=0;Ig.J=function(a){return Ig.s(I(a))};function Jg(a,b){this.F=a;this.ya=b;this.i=32374988;this.C=0}g=Jg.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.ya};g.ua=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null==a?null:new Jg(a,this.ya)};g.P=function(){return Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.ya)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.F.ca(null).Ob(null)};
g.va=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null!=a?new Jg(a,this.ya):zd};g.T=function(){return this};g.U=function(a,b){return new Jg(this.F,b)};g.V=function(a,b){return N(b,this)};Jg.prototype[Ub]=function(){return Bd(this)};function ig(a){return(a=I(a))?new Jg(a,null):null}function Je(a){return pc(a)}function Kg(a,b){this.F=a;this.ya=b;this.i=32374988;this.C=0}g=Kg.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.ya};g.ua=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null==a?null:new Kg(a,this.ya)};g.P=function(){return Fd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.ya)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.F.ca(null).Pb(null)};
g.va=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null!=a?new Kg(a,this.ya):zd};g.T=function(){return this};g.U=function(a,b){return new Kg(this.F,b)};g.V=function(a,b){return N(b,this)};Kg.prototype[Ub]=function(){return Bd(this)};function jg(a){return(a=I(a))?new Kg(a,null):null}function Ke(a){return qc(a)}function Lg(a){return A(kf(a))?Xb.b(function(a,c){return be.b(A(a)?a:gf,c)},a):null}Mg;
function Ng(a){this.Bb=a}Ng.prototype.Ba=function(){return this.Bb.Ba()};Ng.prototype.next=function(){if(this.Bb.Ba())return this.Bb.next().sa[0];throw Error("No such element");};Ng.prototype.remove=function(){return Error("Unsupported operation")};function Og(a,b,c){this.o=a;this.ob=b;this.u=c;this.i=15077647;this.C=8196}g=Og.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.keys=function(){return Bd(I(this))};g.entries=function(){var a=I(this);return new eg(I(a))};
g.values=function(){return Bd(I(this))};g.has=function(a){return xe(this,a)};g.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),h=P(f,0),f=P(f,1);a.b?a.b(f,h):a.call(null,f,h);e+=1}else if(b=I(b))re(b)?(c=Wc(b),b=Xc(b),h=c,d=O(c),c=h):(c=K(b),h=P(c,0),f=P(c,1),a.b?a.b(f,h):a.call(null,f,h),b=L(b),c=null,d=0),e=0;else return null};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){return lc(this.ob,b)?b:c};g.Sa=function(){return new Ng(cd(this.ob))};
g.S=function(){return this.o};g.Y=function(){return Zb(this.ob)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Hd(this)};g.v=function(a,b){return le(b)&&O(this)===O(b)&&jf(function(a){return function(b){return xe(a,b)}}(this),b)};g.wb=function(){return new Mg(Oc(this.ob))};g.X=function(){return Md(Pg,this.o)};g.T=function(){return ig(this.ob)};g.U=function(a,b){return new Og(b,this.ob,this.u)};g.V=function(a,b){return new Og(this.o,ge.c(this.ob,b,null),null)};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.G(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.G(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.G(null,a,b)};var Pg=new Og(null,gf,Id);Og.prototype[Ub]=function(){return Bd(this)};
function Mg(a){this.Wa=a;this.C=136;this.i=259}g=Mg.prototype;g.Tb=function(a,b){this.Wa=Rc(this.Wa,b,null);return this};g.Ub=function(){return new Og(null,Qc(this.Wa),null)};g.Y=function(){return O(this.Wa)};g.L=function(a,b){return kc.c(this,b,null)};g.G=function(a,b,c){return kc.c(this.Wa,b,ue)===ue?c:b};
g.call=function(){function a(a,b,c){return kc.c(this.Wa,b,ue)===ue?c:b}function b(a,b){return kc.c(this.Wa,b,ue)===ue?null:b}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,c,e);case 3:return a.call(this,c,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return kc.c(this.Wa,a,ue)===ue?null:a};g.b=function(a,b){return kc.c(this.Wa,a,ue)===ue?b:a};
function Ie(a){if(null!=a&&(a.C&4096||a.je))return a.Qb(null);if("string"===typeof a)return a;throw Error([F("Doesn't support name: "),F(a)].join(""));}function Qg(a){a:for(var b=a;;)if(I(b))b=L(b);else break a;return a}function Rg(a,b){if("string"===typeof b){var c=a.exec(b);return md.b(K(c),b)?1===O(c)?K(c):Ae(c):null}throw new TypeError("re-matches must match against a string.");}
function Rf(a,b,c,d,e,f,h){var k=Eb;Eb=null==Eb?null:Eb-1;try{if(null!=Eb&&0>Eb)return Lc(a,"#");Lc(a,c);if(0===Nb.a(f))I(h)&&Lc(a,function(){var a=Sg.a(f);return A(a)?a:"..."}());else{if(I(h)){var l=K(h);b.c?b.c(l,a,f):b.call(null,l,a,f)}for(var m=L(h),n=Nb.a(f)-1;;)if(!m||null!=n&&0===n){I(m)&&0===n&&(Lc(a,d),Lc(a,function(){var a=Sg.a(f);return A(a)?a:"..."}()));break}else{Lc(a,d);var p=K(m);c=a;h=f;b.c?b.c(p,c,h):b.call(null,p,c,h);var q=L(m);c=n-1;m=q;n=c}}return Lc(a,e)}finally{Eb=k}}
function Tg(a,b){for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f);Lc(a,h);f+=1}else if(c=I(c))d=c,re(d)?(c=Wc(d),e=Xc(d),d=c,h=O(c),c=e,e=h):(h=K(d),Lc(a,h),c=L(d),d=null,e=0),f=0;else return null}var Ug={'"':'\\"',"\\":"\\\\","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t"};function Vg(a){return[F('"'),F(a.replace(RegExp('[\\\\"\b\f\n\r\t]',"g"),function(a){return Ug[a]})),F('"')].join("")}Wg;
function Xg(a,b){var c=we(H.b(a,Lb));return c?(c=null!=b?b.i&131072||b.ie?!0:!1:!1)?null!=je(b):c:c}
function Yg(a,b,c){if(null==a)return Lc(b,"nil");if(Xg(c,a)){Lc(b,"^");var d=je(a);Sf.c?Sf.c(d,b,c):Sf.call(null,d,b,c);Lc(b," ")}if(a.sd)return a.re(b);if(null!=a&&(a.i&2147483648||a.R))return a.M(null,b,c);if(!0===a||!1===a||"number"===typeof a)return Lc(b,""+F(a));if(null!=a&&a.constructor===Object)return Lc(b,"#js "),d=He.b(function(b){return new Q(null,2,5,U,[Re.a(b),a[b]],null)},se(a)),Wg.m?Wg.m(d,Sf,b,c):Wg.call(null,d,Sf,b,c);if(Qb(a))return Rf(b,Sf,"#js ["," ","]",c,a);if(fa(a))return A(Kb.a(c))?
Lc(b,Vg(a)):Lc(b,a);if(ga(a)){var e=a.name;c=A(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Function":e;return Tg(b,vd(["#object[",c,' "',""+F(a),'"]'],0))}if(a instanceof Date)return c=function(a,b){for(var c=""+F(a);;)if(O(c)<b)c=[F("0"),F(c)].join("");else return c},Tg(b,vd(['#inst "',""+F(a.getUTCFullYear()),"-",c(a.getUTCMonth()+1,2),"-",c(a.getUTCDate(),2),"T",c(a.getUTCHours(),2),":",c(a.getUTCMinutes(),2),":",c(a.getUTCSeconds(),2),".",c(a.getUTCMilliseconds(),3),"-",'00:00"'],
0));if(a instanceof RegExp)return Tg(b,vd(['#"',a.source,'"'],0));if(null!=a&&(a.i&2147483648||a.R))return Mc(a,b,c);if(A(a.constructor.oc))return Tg(b,vd(["#object[",a.constructor.oc.replace(RegExp("/","g"),"."),"]"],0));e=a.constructor.name;c=A(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Object":e;return Tg(b,vd(["#object[",c," ",""+F(a),"]"],0))}function Sf(a,b,c){var d=Zg.a(c);return A(d)?(c=ge.c(c,$g,Yg),d.c?d.c(a,b,c):d.call(null,a,b,c)):Yg(a,b,c)}
var pf=function pf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return pf.s(0<c.length?new xd(c.slice(0),0):null)};pf.s=function(a){var b=Gb();if(null==a||Rb(I(a)))b="";else{var c=F,d=new zb;a:{var e=new dd(d);Sf(K(a),e,b);a=I(L(a));for(var f=null,h=0,k=0;;)if(k<h){var l=f.O(null,k);Lc(e," ");Sf(l,e,b);k+=1}else if(a=I(a))f=a,re(f)?(a=Wc(f),h=Xc(f),f=a,l=O(a),a=h,h=l):(l=K(f),Lc(e," "),Sf(l,e,b),a=L(f),f=null,h=0),k=0;else break a}b=""+c(d)}return b};pf.A=0;
pf.J=function(a){return pf.s(I(a))};function Wg(a,b,c,d){return Rf(c,function(a,c,d){var k=pc(a);b.c?b.c(k,c,d):b.call(null,k,c,d);Lc(c," ");a=qc(a);return b.c?b.c(a,c,d):b.call(null,a,c,d)},"{",", ","}",d,I(a))}uf.prototype.R=!0;uf.prototype.M=function(a,b,c){Lc(b,"#object [cljs.core.Volatile ");Sf(new Hb(null,1,[ah,this.state],null),b,c);return Lc(b,"]")};xd.prototype.R=!0;xd.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Se.prototype.R=!0;
Se.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Cg.prototype.R=!0;Cg.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Hg.prototype.R=!0;Hg.prototype.M=function(a,b,c){return Rf(b,Sf,"["," ","]",c,this)};hg.prototype.R=!0;hg.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Dd.prototype.R=!0;Dd.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};qe.prototype.R=!0;qe.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};
Pe.prototype.R=!0;Pe.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Vd.prototype.R=!0;Vd.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};fe.prototype.R=!0;fe.prototype.M=function(a,b,c){return Wg(this,Sf,b,c)};Dg.prototype.R=!0;Dg.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Wf.prototype.R=!0;Wf.prototype.M=function(a,b,c){return Rf(b,Sf,"["," ","]",c,this)};Og.prototype.R=!0;Og.prototype.M=function(a,b,c){return Rf(b,Sf,"#{"," ","}",c,this)};
pe.prototype.R=!0;pe.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};nf.prototype.R=!0;nf.prototype.M=function(a,b,c){Lc(b,"#object [cljs.core.Atom ");Sf(new Hb(null,1,[ah,this.state],null),b,c);return Lc(b,"]")};Kg.prototype.R=!0;Kg.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Gg.prototype.R=!0;Gg.prototype.M=function(a,b,c){return Rf(b,Sf,"["," ","]",c,this)};Q.prototype.R=!0;Q.prototype.M=function(a,b,c){return Rf(b,Sf,"["," ","]",c,this)};Ne.prototype.R=!0;
Ne.prototype.M=function(a,b){return Lc(b,"()")};hf.prototype.R=!0;hf.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Hb.prototype.R=!0;Hb.prototype.M=function(a,b,c){return Wg(this,Sf,b,c)};Jg.prototype.R=!0;Jg.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};Wd.prototype.R=!0;Wd.prototype.M=function(a,b,c){return Rf(b,Sf,"("," ",")",c,this)};ld.prototype.Mb=!0;
ld.prototype.vb=function(a,b){if(b instanceof ld)return td(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};B.prototype.Mb=!0;B.prototype.vb=function(a,b){if(b instanceof B)return Qe(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};Wf.prototype.Mb=!0;Wf.prototype.vb=function(a,b){if(oe(b))return ye(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};Q.prototype.Mb=!0;
Q.prototype.vb=function(a,b){if(oe(b))return ye(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};function bh(a){return function(b,c){var d=a.b?a.b(b,c):a.call(null,b,c);return Od(d)?new Nd(d):d}}
function vf(a){return function(b){return function(){function c(a,c){return Xb.c(b,a,c)}function d(b){return a.a?a.a(b):a.call(null,b)}function e(){return a.B?a.B():a.call(null)}var f=null,f=function(a,b){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b)}throw Error("Invalid arity: "+arguments.length);};f.B=e;f.a=d;f.b=c;return f}()}(bh(a))}ch;function dh(){}
var eh=function eh(b){if(null!=b&&null!=b.fe)return b.fe(b);var c=eh[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=eh._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEncodeJS.-clj-\x3ejs",b);};fh;function gh(a){return(null!=a?a.ee||(a.xb?0:C(dh,a)):C(dh,a))?eh(a):"string"===typeof a||"number"===typeof a||a instanceof B||a instanceof ld?fh.a?fh.a(a):fh.call(null,a):pf.s(vd([a],0))}
var fh=function fh(b){if(null==b)return null;if(null!=b?b.ee||(b.xb?0:C(dh,b)):C(dh,b))return eh(b);if(b instanceof B)return Ie(b);if(b instanceof ld)return""+F(b);if(ne(b)){var c={};b=I(b);for(var d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);c[gh(k)]=fh(h);f+=1}else if(b=I(b))re(b)?(e=Wc(b),b=Xc(b),d=e,e=O(e)):(e=K(b),d=P(e,0),e=P(e,1),c[gh(d)]=fh(e),b=L(b),d=null,e=0),f=0;else break;return c}if(ke(b)){c=[];b=I(He.b(fh,b));d=null;for(f=e=0;;)if(f<e)k=d.O(null,f),c.push(k),f+=1;else if(b=
I(b))d=b,re(d)?(b=Wc(d),f=Xc(d),d=b,e=O(b),b=f):(b=K(d),c.push(b),b=L(d),d=null,e=0),f=0;else break;return c}return b};function hh(){}var ih=function ih(b,c){if(null!=b&&null!=b.de)return b.de(b,c);var d=ih[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=ih._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IEncodeClojure.-js-\x3eclj",b);};
function jh(a){var b=vd([new Hb(null,1,[kh,!1],null)],0),c=null!=b&&(b.i&64||b.gb)?Wb.b(Jd,b):b,d=H.b(c,kh);return function(a,c,d,k){return function m(n){return(null!=n?n.yf||(n.xb?0:C(hh,n)):C(hh,n))?ih(n,Wb.b(Ig,b)):ve(n)?Qg(He.b(m,n)):ke(n)?xf.b(null==n?null:$b(n),He.b(m,n)):Qb(n)?Ae(He.b(m,n)):Sb(n)===Object?xf.b(gf,function(){return function(a,b,c,d){return function w(e){return new Se(null,function(a,b,c,d){return function(){for(;;){var a=I(e);if(a){if(re(a)){var b=Wc(a),c=O(b),f=new Ve(Array(c),
0);a:for(var h=0;;)if(h<c){var k=G.b(b,h),k=new Q(null,2,5,U,[d.a?d.a(k):d.call(null,k),m(n[k])],null);f.add(k);h+=1}else{b=!0;break a}return b?We(f.Fa(),w(Xc(a))):We(f.Fa(),null)}f=K(a);return N(new Q(null,2,5,U,[d.a?d.a(f):d.call(null,f),m(n[f])],null),w(yd(a)))}return null}}}(a,b,c,d),null,null)}}(a,c,d,k)(se(n))}()):n}}(b,c,d,A(d)?Re:F)(a)}
var ch=function ch(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return ch.B();case 1:return ch.a(arguments[0]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};ch.B=function(){return ch.a(1)};ch.a=function(a){return Math.random()*a};ch.A=1;var lh=null;function mh(){if(null==lh){var a=new Hb(null,3,[nh,gf,oh,gf,ph,gf],null);lh=V.a?V.a(a):V.call(null,a)}return lh}
function qh(a,b,c){var d=md.b(b,c);if(!d&&!(d=xe(ph.a(a).call(null,b),c))&&(d=oe(c))&&(d=oe(b)))if(d=O(c)===O(b))for(var d=!0,e=0;;)if(d&&e!==O(c))d=qh(a,b.a?b.a(e):b.call(null,e),c.a?c.a(e):c.call(null,e)),e+=1;else return d;else return d;else return d}function rh(a){var b;b=mh();b=M.a?M.a(b):M.call(null,b);a=H.b(nh.a(b),a);return I(a)?a:null}function sh(a,b,c,d){tf.b(a,function(){return M.a?M.a(b):M.call(null,b)});tf.b(c,function(){return M.a?M.a(d):M.call(null,d)})}
var th=function th(b,c,d){var e=(M.a?M.a(d):M.call(null,d)).call(null,b),e=A(A(e)?e.a?e.a(c):e.call(null,c):e)?!0:null;if(A(e))return e;e=function(){for(var e=rh(c);;)if(0<O(e))th(b,K(e),d),e=yd(e);else return null}();if(A(e))return e;e=function(){for(var e=rh(b);;)if(0<O(e))th(K(e),c,d),e=yd(e);else return null}();return A(e)?e:!1};function uh(a,b,c){c=th(a,b,c);if(A(c))a=c;else{c=qh;var d;d=mh();d=M.a?M.a(d):M.call(null,d);a=c(d,a,b)}return a}
var vh=function vh(b,c,d,e,f,h,k){var l=Xb.c(function(e,h){var k=P(h,0);P(h,1);if(qh(M.a?M.a(d):M.call(null,d),c,k)){var l;l=(l=null==e)?l:uh(k,K(e),f);l=A(l)?h:e;if(!A(uh(K(l),k,f)))throw Error([F("Multiple methods in multimethod '"),F(b),F("' match dispatch value: "),F(c),F(" -\x3e "),F(k),F(" and "),F(K(l)),F(", and neither is preferred")].join(""));return l}return e},null,M.a?M.a(e):M.call(null,e));if(A(l)){if(md.b(M.a?M.a(k):M.call(null,k),M.a?M.a(d):M.call(null,d)))return tf.m(h,ge,c,ae(l)),
ae(l);sh(h,e,k,d);return vh(b,c,d,e,f,h,k)}return null};function W(a,b){throw Error([F("No method in multimethod '"),F(a),F("' for dispatch value: "),F(b)].join(""));}function wh(a,b,c,d,e,f,h,k){this.name=a;this.h=b;this.xe=c;this.Xb=d;this.Cb=e;this.Ne=f;this.ac=h;this.Kb=k;this.i=4194305;this.C=4352}g=wh.prototype;
g.call=function(){function a(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J,S){a=this;var ra=Wb.s(a.h,b,c,d,e,vd([f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J,S],0)),si=Z(this,ra);A(si)||W(a.name,ra);return Wb.s(si,b,c,d,e,vd([f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J,S],0))}function b(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J){a=this;var S=a.h.oa?a.h.oa(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J),ra=Z(this,S);A(ra)||W(a.name,S);return ra.oa?ra.oa(b,c,d,e,f,h,k,l,m,n,p,q,r,
u,v,w,z,x,E,J):ra.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E,J)}function c(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E){a=this;var J=a.h.na?a.h.na(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E),S=Z(this,J);A(S)||W(a.name,J);return S.na?S.na(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E):S.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x,E)}function d(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x){a=this;var E=a.h.ma?a.h.ma(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x):a.h.call(null,
b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x),J=Z(this,E);A(J)||W(a.name,E);return J.ma?J.ma(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x):J.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,x)}function e(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z){a=this;var x=a.h.la?a.h.la(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z),E=Z(this,x);A(E)||W(a.name,x);return E.la?E.la(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):E.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z)}function f(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,
w){a=this;var z=a.h.ka?a.h.ka(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w),x=Z(this,z);A(x)||W(a.name,z);return x.ka?x.ka(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):x.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w)}function h(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v){a=this;var w=a.h.ja?a.h.ja(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v),z=Z(this,w);A(z)||W(a.name,w);return z.ja?z.ja(b,c,d,e,f,h,k,l,m,n,p,q,r,u,v):z.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v)}
function k(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u){a=this;var v=a.h.ia?a.h.ia(b,c,d,e,f,h,k,l,m,n,p,q,r,u):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u),w=Z(this,v);A(w)||W(a.name,v);return w.ia?w.ia(b,c,d,e,f,h,k,l,m,n,p,q,r,u):w.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,u)}function l(a,b,c,d,e,f,h,k,l,m,n,p,q,r){a=this;var u=a.h.ha?a.h.ha(b,c,d,e,f,h,k,l,m,n,p,q,r):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r),v=Z(this,u);A(v)||W(a.name,u);return v.ha?v.ha(b,c,d,e,f,h,k,l,m,n,p,q,r):v.call(null,b,c,d,e,f,h,k,l,m,n,p,
q,r)}function m(a,b,c,d,e,f,h,k,l,m,n,p,q){a=this;var r=a.h.ga?a.h.ga(b,c,d,e,f,h,k,l,m,n,p,q):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q),u=Z(this,r);A(u)||W(a.name,r);return u.ga?u.ga(b,c,d,e,f,h,k,l,m,n,p,q):u.call(null,b,c,d,e,f,h,k,l,m,n,p,q)}function n(a,b,c,d,e,f,h,k,l,m,n,p){a=this;var q=a.h.fa?a.h.fa(b,c,d,e,f,h,k,l,m,n,p):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p),r=Z(this,q);A(r)||W(a.name,q);return r.fa?r.fa(b,c,d,e,f,h,k,l,m,n,p):r.call(null,b,c,d,e,f,h,k,l,m,n,p)}function p(a,b,c,d,e,f,h,k,l,m,
n){a=this;var p=a.h.ea?a.h.ea(b,c,d,e,f,h,k,l,m,n):a.h.call(null,b,c,d,e,f,h,k,l,m,n),q=Z(this,p);A(q)||W(a.name,p);return q.ea?q.ea(b,c,d,e,f,h,k,l,m,n):q.call(null,b,c,d,e,f,h,k,l,m,n)}function q(a,b,c,d,e,f,h,k,l,m){a=this;var n=a.h.qa?a.h.qa(b,c,d,e,f,h,k,l,m):a.h.call(null,b,c,d,e,f,h,k,l,m),p=Z(this,n);A(p)||W(a.name,n);return p.qa?p.qa(b,c,d,e,f,h,k,l,m):p.call(null,b,c,d,e,f,h,k,l,m)}function r(a,b,c,d,e,f,h,k,l){a=this;var m=a.h.pa?a.h.pa(b,c,d,e,f,h,k,l):a.h.call(null,b,c,d,e,f,h,k,l),n=
Z(this,m);A(n)||W(a.name,m);return n.pa?n.pa(b,c,d,e,f,h,k,l):n.call(null,b,c,d,e,f,h,k,l)}function u(a,b,c,d,e,f,h,k){a=this;var l=a.h.W?a.h.W(b,c,d,e,f,h,k):a.h.call(null,b,c,d,e,f,h,k),m=Z(this,l);A(m)||W(a.name,l);return m.W?m.W(b,c,d,e,f,h,k):m.call(null,b,c,d,e,f,h,k)}function v(a,b,c,d,e,f,h){a=this;var k=a.h.I?a.h.I(b,c,d,e,f,h):a.h.call(null,b,c,d,e,f,h),l=Z(this,k);A(l)||W(a.name,k);return l.I?l.I(b,c,d,e,f,h):l.call(null,b,c,d,e,f,h)}function w(a,b,c,d,e,f){a=this;var h=a.h.w?a.h.w(b,c,
d,e,f):a.h.call(null,b,c,d,e,f),k=Z(this,h);A(k)||W(a.name,h);return k.w?k.w(b,c,d,e,f):k.call(null,b,c,d,e,f)}function z(a,b,c,d,e){a=this;var f=a.h.m?a.h.m(b,c,d,e):a.h.call(null,b,c,d,e),h=Z(this,f);A(h)||W(a.name,f);return h.m?h.m(b,c,d,e):h.call(null,b,c,d,e)}function E(a,b,c,d){a=this;var e=a.h.c?a.h.c(b,c,d):a.h.call(null,b,c,d),f=Z(this,e);A(f)||W(a.name,e);return f.c?f.c(b,c,d):f.call(null,b,c,d)}function J(a,b,c){a=this;var d=a.h.b?a.h.b(b,c):a.h.call(null,b,c),e=Z(this,d);A(e)||W(a.name,
d);return e.b?e.b(b,c):e.call(null,b,c)}function S(a,b){a=this;var c=a.h.a?a.h.a(b):a.h.call(null,b),d=Z(this,c);A(d)||W(a.name,c);return d.a?d.a(b):d.call(null,b)}function ra(a){a=this;var b=a.h.B?a.h.B():a.h.call(null),c=Z(this,b);A(c)||W(a.name,b);return c.B?c.B():c.call(null)}var x=null,x=function(x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb,Jb,dc,Kc,Kd,Zf){switch(arguments.length){case 1:return ra.call(this,x);case 2:return S.call(this,x,R);case 3:return J.call(this,x,R,T);case 4:return E.call(this,
x,R,T,X);case 5:return z.call(this,x,R,T,X,Y);case 6:return w.call(this,x,R,T,X,Y,ca);case 7:return v.call(this,x,R,T,X,Y,ca,ha);case 8:return u.call(this,x,R,T,X,Y,ca,ha,ka);case 9:return r.call(this,x,R,T,X,Y,ca,ha,ka,na);case 10:return q.call(this,x,R,T,X,Y,ca,ha,ka,na,qa);case 11:return p.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va);case 12:return n.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya);case 13:return m.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka);case 14:return l.call(this,x,R,T,X,Y,ca,ha,ka,na,
qa,va,ya,Ka,cc);case 15:return k.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua);case 16:return h.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db);case 17:return f.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb);case 18:return e.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb,Jb);case 19:return d.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb,Jb,dc);case 20:return c.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb,Jb,dc,Kc);case 21:return b.call(this,x,R,T,
X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb,Jb,dc,Kc,Kd);case 22:return a.call(this,x,R,T,X,Y,ca,ha,ka,na,qa,va,ya,Ka,cc,Ua,db,qb,Jb,dc,Kc,Kd,Zf)}throw Error("Invalid arity: "+arguments.length);};x.a=ra;x.b=S;x.c=J;x.m=E;x.w=z;x.I=w;x.W=v;x.pa=u;x.qa=r;x.ea=q;x.fa=p;x.ga=n;x.ha=m;x.ia=l;x.ja=k;x.ka=h;x.la=f;x.ma=e;x.na=d;x.oa=c;x.Sc=b;x.Nb=a;return x}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.B=function(){var a=this.h.B?this.h.B():this.h.call(null),b=Z(this,a);A(b)||W(this.name,a);return b.B?b.B():b.call(null)};g.a=function(a){var b=this.h.a?this.h.a(a):this.h.call(null,a),c=Z(this,b);A(c)||W(this.name,b);return c.a?c.a(a):c.call(null,a)};g.b=function(a,b){var c=this.h.b?this.h.b(a,b):this.h.call(null,a,b),d=Z(this,c);A(d)||W(this.name,c);return d.b?d.b(a,b):d.call(null,a,b)};
g.c=function(a,b,c){var d=this.h.c?this.h.c(a,b,c):this.h.call(null,a,b,c),e=Z(this,d);A(e)||W(this.name,d);return e.c?e.c(a,b,c):e.call(null,a,b,c)};g.m=function(a,b,c,d){var e=this.h.m?this.h.m(a,b,c,d):this.h.call(null,a,b,c,d),f=Z(this,e);A(f)||W(this.name,e);return f.m?f.m(a,b,c,d):f.call(null,a,b,c,d)};g.w=function(a,b,c,d,e){var f=this.h.w?this.h.w(a,b,c,d,e):this.h.call(null,a,b,c,d,e),h=Z(this,f);A(h)||W(this.name,f);return h.w?h.w(a,b,c,d,e):h.call(null,a,b,c,d,e)};
g.I=function(a,b,c,d,e,f){var h=this.h.I?this.h.I(a,b,c,d,e,f):this.h.call(null,a,b,c,d,e,f),k=Z(this,h);A(k)||W(this.name,h);return k.I?k.I(a,b,c,d,e,f):k.call(null,a,b,c,d,e,f)};g.W=function(a,b,c,d,e,f,h){var k=this.h.W?this.h.W(a,b,c,d,e,f,h):this.h.call(null,a,b,c,d,e,f,h),l=Z(this,k);A(l)||W(this.name,k);return l.W?l.W(a,b,c,d,e,f,h):l.call(null,a,b,c,d,e,f,h)};
g.pa=function(a,b,c,d,e,f,h,k){var l=this.h.pa?this.h.pa(a,b,c,d,e,f,h,k):this.h.call(null,a,b,c,d,e,f,h,k),m=Z(this,l);A(m)||W(this.name,l);return m.pa?m.pa(a,b,c,d,e,f,h,k):m.call(null,a,b,c,d,e,f,h,k)};g.qa=function(a,b,c,d,e,f,h,k,l){var m=this.h.qa?this.h.qa(a,b,c,d,e,f,h,k,l):this.h.call(null,a,b,c,d,e,f,h,k,l),n=Z(this,m);A(n)||W(this.name,m);return n.qa?n.qa(a,b,c,d,e,f,h,k,l):n.call(null,a,b,c,d,e,f,h,k,l)};
g.ea=function(a,b,c,d,e,f,h,k,l,m){var n=this.h.ea?this.h.ea(a,b,c,d,e,f,h,k,l,m):this.h.call(null,a,b,c,d,e,f,h,k,l,m),p=Z(this,n);A(p)||W(this.name,n);return p.ea?p.ea(a,b,c,d,e,f,h,k,l,m):p.call(null,a,b,c,d,e,f,h,k,l,m)};g.fa=function(a,b,c,d,e,f,h,k,l,m,n){var p=this.h.fa?this.h.fa(a,b,c,d,e,f,h,k,l,m,n):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n),q=Z(this,p);A(q)||W(this.name,p);return q.fa?q.fa(a,b,c,d,e,f,h,k,l,m,n):q.call(null,a,b,c,d,e,f,h,k,l,m,n)};
g.ga=function(a,b,c,d,e,f,h,k,l,m,n,p){var q=this.h.ga?this.h.ga(a,b,c,d,e,f,h,k,l,m,n,p):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p),r=Z(this,q);A(r)||W(this.name,q);return r.ga?r.ga(a,b,c,d,e,f,h,k,l,m,n,p):r.call(null,a,b,c,d,e,f,h,k,l,m,n,p)};g.ha=function(a,b,c,d,e,f,h,k,l,m,n,p,q){var r=this.h.ha?this.h.ha(a,b,c,d,e,f,h,k,l,m,n,p,q):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q),u=Z(this,r);A(u)||W(this.name,r);return u.ha?u.ha(a,b,c,d,e,f,h,k,l,m,n,p,q):u.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q)};
g.ia=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r){var u=this.h.ia?this.h.ia(a,b,c,d,e,f,h,k,l,m,n,p,q,r):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r),v=Z(this,u);A(v)||W(this.name,u);return v.ia?v.ia(a,b,c,d,e,f,h,k,l,m,n,p,q,r):v.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r)};
g.ja=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u){var v=this.h.ja?this.h.ja(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u),w=Z(this,v);A(w)||W(this.name,v);return w.ja?w.ja(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u):w.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u)};
g.ka=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v){var w=this.h.ka?this.h.ka(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v),z=Z(this,w);A(z)||W(this.name,w);return z.ka?z.ka(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v):z.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v)};
g.la=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w){var z=this.h.la?this.h.la(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w),E=Z(this,z);A(E)||W(this.name,z);return E.la?E.la(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w):E.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w)};
g.ma=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z){var E=this.h.ma?this.h.ma(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z),J=Z(this,E);A(J)||W(this.name,E);return J.ma?J.ma(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z):J.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z)};
g.na=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E){var J=this.h.na?this.h.na(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E),S=Z(this,J);A(S)||W(this.name,J);return S.na?S.na(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E):S.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E)};
g.oa=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J){var S=this.h.oa?this.h.oa(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J):this.h.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J),ra=Z(this,S);A(ra)||W(this.name,S);return ra.oa?ra.oa(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J):ra.call(null,a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J)};
g.Sc=function(a,b,c,d,e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S){var ra=Wb.s(this.h,a,b,c,d,vd([e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S],0)),x=Z(this,ra);A(x)||W(this.name,ra);return Wb.s(x,a,b,c,d,vd([e,f,h,k,l,m,n,p,q,r,u,v,w,z,E,J,S],0))};function xh(a,b){var c=yh;tf.m(c.Cb,ge,a,b);sh(c.ac,c.Cb,c.Kb,c.Xb)}
function Z(a,b){md.b(M.a?M.a(a.Kb):M.call(null,a.Kb),M.a?M.a(a.Xb):M.call(null,a.Xb))||sh(a.ac,a.Cb,a.Kb,a.Xb);var c=(M.a?M.a(a.ac):M.call(null,a.ac)).call(null,b);if(A(c))return c;c=vh(a.name,b,a.Xb,a.Cb,a.Ne,a.ac,a.Kb);return A(c)?c:(M.a?M.a(a.Cb):M.call(null,a.Cb)).call(null,a.xe)}g.Qb=function(){return Zc(this.name)};g.Rb=function(){return $c(this.name)};g.P=function(){return ja(this)};var zh=new B(null,"orders","orders",-1032870176),Ah=new B(null,"from-date","from-date",1469949792),Bh=new B(null,"date","date",-1463434462),Ch=new B(null,"remove","remove",-131428414),Lb=new B(null,"meta","meta",1499536964),Dh=new B(null,"color","color",1011675173),Mb=new B(null,"dup","dup",556298533),sf=new ld(null,"new-value","new-value",-1567397401,null),of=new B(null,"validator","validator",-1966190681),Eh=new B(null,"to-date","to-date",500848648),Fh=new B(null,"default","default",-1987822328),
Gh=new B(null,"name","name",1843675177),Hh=new B(null,"value","value",305978217),Ih=new B(null,"coll","coll",1647737163),ah=new B(null,"val","val",128701612),Jh=new B(null,"type","type",1174270348),rf=new ld(null,"validate","validate",1439230700,null),Kh=new B(null,"orders-points","orders-points",-2041931475),$g=new B(null,"fallback-impl","fallback-impl",-1501286995),Ib=new B(null,"flush-on-newline","flush-on-newline",-151457939),Lh=new B(null,"print","print",1299562414),oh=new B(null,"descendants",
"descendants",1824886031),Mh=new B(null,"title","title",636505583),ph=new B(null,"ancestors","ancestors",-776045424),Nh=new B(null,"style","style",-496642736),Oh=new B(null,"cancelled","cancelled",488726224),Ph=new B(null,"div","div",1057191632),Kb=new B(null,"readably","readably",1129599760),Sg=new B(null,"more-marker","more-marker",-14717935),Qh=new B(null,"google-map","google-map",1960730035),Rh=new B(null,"status","status",-1997798413),Nb=new B(null,"print-length","print-length",1931866356),Sh=
new B(null,"unassigned","unassigned",-1438879244),Th=new B(null,"id","id",-1388402092),Uh=new B(null,"class","class",-2030961996),Vh=new B(null,"checked","checked",-50955819),nh=new B(null,"parents","parents",-2027538891),Wh=new B(null,"br","br",934104792),Xh=new B(null,"complete","complete",-500388775),Yh=new B(null,"input","input",556931961),Zh=new B(null,"xhtml","xhtml",1912943770),ff=new ld(null,"quote","quote",1377916282,null),ef=new B(null,"arglists","arglists",1661989754),df=new ld(null,"nil-iter",
"nil-iter",1101030523,null),$h=new B(null,"add","add",235287739),ai=new B(null,"hierarchy","hierarchy",-1053470341),Zg=new B(null,"alt-impl","alt-impl",670969595),bi=new B(null,"selected?","selected?",-742502788),kh=new B(null,"keywordize-keys","keywordize-keys",1310784252),ci=new B(null,"servicing","servicing",-1502937442),di=new B(null,"text","text",-1790561697),ei=new B(null,"enroute","enroute",-1681821057),fi=new B(null,"attr","attr",-604132353);function gi(a){var b=/\./;if("string"===typeof b)return a.replace(new RegExp(Ba(b),"g")," ");if(b instanceof RegExp)return a.replace(new RegExp(b.source,"g")," ");throw[F("Invalid match arg: "),F(b)].join("");};var hi={};function ii(a,b){var c=hi[b];if(!c){var d=Ea(b),c=d;void 0===a.style[d]&&(d=(lb?"Webkit":kb?"Moz":ib?"ms":hb?"O":null)+Fa(d),void 0!==a.style[d]&&(c=d));hi[b]=c}return c};function ji(){}function ki(){}var li=function li(b){if(null!=b&&null!=b.te)return b.te(b);var c=li[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=li._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("bindable.-value",b);},mi=function mi(b,c){if(null!=b&&null!=b.se)return b.se(b,c);var d=mi[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=mi._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("bindable.-on-change",b);};
function ni(a){return null!=a?a.Ff?!0:a.xb?!1:C(ki,a):C(ki,a)}function oi(a){return null!=a?a.Gf?!0:a.xb?!1:C(ji,a):C(ji,a)}function pi(a,b){return mi(a,b)};var qi=new Hb(null,2,[Zh,"http://www.w3.org/1999/xhtml",new B(null,"svg","svg",856789142),"http://www.w3.org/2000/svg"],null);ri;ti;ui;V.a?V.a(0):V.call(null,0);var vi=V.a?V.a(ce):V.call(null,ce);function wi(a,b){tf.c(vi,be,new Q(null,2,5,U,[a,b],null))}function xi(){}
var yi=function yi(b){if(null!=b&&null!=b.ve)return b.ve(b);var c=yi[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=yi._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("Element.-elem",b);},zi=function zi(b,c){for(var d=I(c),e=null,f=0,h=0;;)if(h<f){var k=e.O(null,h),l;if(null!=k?k.ue||(k.xb?0:C(xi,k)):C(xi,k))l=yi(k);else if(null==k)l=null;else{if(ne(k))throw"Maps cannot be used as content";"string"===typeof k?l=document.createTextNode(String(k)):oe(k)?l=ri.a?ri.a(k):ri.call(null,
k):ve(k)?l=zi(b,k):A(oi(k))?(wi(Ih,k),l=zi(b,new Q(null,1,5,U,[li(k)],null))):A(ni(k))?(wi(di,k),l=zi(b,new Q(null,1,5,U,[li(k)],null))):l=A(k.nodeName)?k:A(k.get)?k.get(0):function(){var b=""+F(k);return document.createTextNode(String(b))}()}A(l)&&b.appendChild(l);h+=1}else if(d=I(d)){if(re(d))f=Wc(d),d=Xc(d),e=f,f=O(f);else{k=K(d);if(null!=k?k.ue||(k.xb?0:C(xi,k)):C(xi,k))e=yi(k);else if(null==k)e=null;else{if(ne(k))throw"Maps cannot be used as content";"string"===typeof k?e=document.createTextNode(String(k)):
oe(k)?e=ri.a?ri.a(k):ri.call(null,k):ve(k)?e=zi(b,k):A(oi(k))?(wi(Ih,k),e=zi(b,new Q(null,1,5,U,[li(k)],null))):A(ni(k))?(wi(di,k),e=zi(b,new Q(null,1,5,U,[li(k)],null))):e=A(k.nodeName)?k:A(k.get)?k.get(0):function(){var b=""+F(k);return document.createTextNode(String(b))}()}A(e)&&b.appendChild(e);d=L(d);e=null;f=0}h=0}else return null};
if("undefined"===typeof yh)var yh=function(){var a=V.a?V.a(gf):V.call(null,gf),b=V.a?V.a(gf):V.call(null,gf),c=V.a?V.a(gf):V.call(null,gf),d=V.a?V.a(gf):V.call(null,gf),e=H.c(gf,ai,mh());return new wh(ud.b("crate.compiler","dom-binding"),function(){return function(a){return a}}(a,b,c,d,e),Fh,e,a,b,c,d)}();xh(di,function(a,b,c){return pi(b,function(a){for(var b;b=c.firstChild;)c.removeChild(b);return zi(c,new Q(null,1,5,U,[a],null))})});
xh(fi,function(a,b,c){a=P(b,0);var d=P(b,1);return pi(d,function(a,b){return function(a){return ti.c?ti.c(c,b,a):ti.call(null,c,b,a)}}(b,a,d))});xh(Nh,function(a,b,c){a=P(b,0);var d=P(b,1);return pi(d,function(a,b){return function(a){return A(b)?ui.c?ui.c(c,b,a):ui.call(null,c,b,a):ui.b?ui.b(c,a):ui.call(null,c,a)}}(b,a,d))});
xh(Ih,function(a,b,c){return pi(b,function(a,e,f){if(A(md.b?md.b($h,a):md.call(null,$h,a)))return a=b.Ke.call(null,$h),A(a)?e=a.c?a.c(c,e,f):a.call(null,c,e,f):(c.appendChild(e),e=void 0),e;if(A(md.b?md.b(Ch,a):md.call(null,Ch,a)))return f=b.Ke.call(null,Ch),A(f)?f.a?f.a(e):f.call(null,e):xb(e);throw Error([F("No matching clause: "),F(a)].join(""));})});
var ui=function ui(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ui.b(arguments[0],arguments[1]);case 3:return ui.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
ui.b=function(a,b){if("string"===typeof b)a.setAttribute("style",b);else if(ne(b))for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);ui.c(a,k,h);f+=1}else if(c=I(c))re(c)?(e=Wc(c),c=Xc(c),d=e,e=O(e)):(e=K(c),d=P(e,0),e=P(e,1),ui.c(a,d,e),c=L(c),d=null,e=0),f=0;else break;else A(ni(b))&&(wi(Nh,new Q(null,2,5,U,[null,b],null)),ui.b(a,li(b)));return a};
ui.c=function(a,b,c){A(ni(c))&&(wi(Nh,new Q(null,2,5,U,[b,c],null)),c=li(c));b=Ie(b);if(fa(b)){var d=ii(a,b);d&&(a.style[d]=c)}else for(d in b){c=a;var e=b[d],f=ii(c,d);f&&(c.style[f]=e)}};ui.A=3;var ti=function ti(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ti.b(arguments[0],arguments[1]);case 3:return ti.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
ti.b=function(a,b){if(A(a)){if(ne(b)){for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);ti.c(a,k,h);f+=1}else if(c=I(c))re(c)?(e=Wc(c),c=Xc(c),d=e,e=O(e)):(e=K(c),d=P(e,0),e=P(e,1),ti.c(a,d,e),c=L(c),d=null,e=0),f=0;else break;return a}return a.getAttribute(Ie(b))}return null};ti.c=function(a,b,c){md.b(b,Nh)?ui.b(a,c):(A(ni(c))&&(wi(fi,new Q(null,2,5,U,[b,c],null)),c=li(c)),a.setAttribute(Ie(b),c));return a};ti.A=3;var Ai=/([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?/;
function Bi(a){return xf.b(gf,He.b(function(a){var c=P(a,0);a=P(a,1);return!0===a?new Q(null,2,5,U,[c,Ie(c)],null):new Q(null,2,5,U,[c,a],null)},wf(lf.b(we,ae),a)))}
function Ci(a){var b=P(a,0),c=Ge(a);if(!(b instanceof B||b instanceof ld||"string"===typeof b))throw[F(b),F(" is not a valid tag name.")].join("");var d=Rg(Ai,Ie(b)),e=P(d,0),f=P(d,1),h=P(d,2),k=P(d,3),l=function(){var a,b=/:/;a:for(b="/(?:)/"===""+F(b)?be.b(Ae(N("",He.b(F,I(f)))),""):Ae((""+F(f)).split(b));;)if(""===(null==b?null:sc(b)))b=null==b?null:tc(b);else break a;a=b;b=P(a,0);a=P(a,1);var c;c=Re.a(b);c=qi.a?qi.a(c):qi.call(null,c);return A(a)?new Q(null,2,5,U,[A(c)?c:b,a],null):new Q(null,
2,5,U,[Zh.a(qi),b],null)}(),m=P(l,0),n=P(l,1);a=xf.b(gf,wf(function(){return function(a){return null!=ae(a)}}(d,e,f,h,k,l,m,n,a,b,c),new Hb(null,2,[Th,A(h)?h:null,Uh,A(k)?gi(k):null],null)));b=K(c);return ne(b)?new Q(null,4,5,U,[m,n,Lg(vd([a,Bi(b)],0)),L(c)],null):new Q(null,4,5,U,[m,n,a,c],null)}var Di=A(document.createElementNS)?function(a,b){return document.createElementNS(a,b)}:function(a,b){return document.createElement(b)};
function ri(a){var b=vi;vi=V.a?V.a(ce):V.call(null,ce);try{var c=Ci(a),d=P(c,0),e=P(c,1),f=P(c,2),h=P(c,3),k=Di.b?Di.b(d,e):Di.call(null,d,e);ti.b(k,f);zi(k,h);a:{var l=M.a?M.a(vi):M.call(null,vi),m=I(l);a=null;for(d=c=0;;)if(d<c){var n=a.O(null,d),p=P(n,0),q=P(n,1);yh.c?yh.c(p,q,k):yh.call(null,p,q,k);d+=1}else{var r=I(m);if(r){e=r;if(re(e)){var u=Wc(e),v=Xc(e),e=u,w=O(u),m=v;a=e;c=w}else{var z=K(e),p=P(z,0),q=P(z,1);yh.c?yh.c(p,q,k):yh.call(null,p,q,k);m=L(e);a=null;c=0}d=0}else break a}}return k}finally{vi=
b}};V.a?V.a(0):V.call(null,0);function Ei(a){a=He.b(ri,a);return A(ae(a))?a:K(a)};!Xa("Android")||gb()||Xa("Firefox")||fb();gb();function Fi(a){if("function"==typeof a.qc)return a.qc();if(fa(a))return a.split("");if(ea(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return $a(a)}
function Gi(a,b){if("function"==typeof a.forEach)a.forEach(b,void 0);else if(ea(a)||fa(a))La(a,b,void 0);else{var c;if("function"==typeof a.Wb)c=a.Wb();else if("function"!=typeof a.qc)if(ea(a)||fa(a)){c=[];for(var d=a.length,e=0;e<d;e++)c.push(e)}else c=ab(a);else c=void 0;for(var d=Fi(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a)}};function Hi(a,b){this.Ua={};this.wa=[];this.Ta=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)}g=Hi.prototype;g.qc=function(){Ii(this);for(var a=[],b=0;b<this.wa.length;b++)a.push(this.Ua[this.wa[b]]);return a};g.Wb=function(){Ii(this);return this.wa.concat()};
g.equals=function(a,b){if(this===a)return!0;if(this.Ta!=a.Ta)return!1;var c=b||Ji;Ii(this);for(var d,e=0;d=this.wa[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};function Ji(a,b){return a===b}g.isEmpty=function(){return 0==this.Ta};g.clear=function(){this.Ua={};this.Ta=this.wa.length=0};g.remove=function(a){return Object.prototype.hasOwnProperty.call(this.Ua,a)?(delete this.Ua[a],this.Ta--,this.wa.length>2*this.Ta&&Ii(this),!0):!1};
function Ii(a){if(a.Ta!=a.wa.length){for(var b=0,c=0;b<a.wa.length;){var d=a.wa[b];Object.prototype.hasOwnProperty.call(a.Ua,d)&&(a.wa[c++]=d);b++}a.wa.length=c}if(a.Ta!=a.wa.length){for(var e={},c=b=0;b<a.wa.length;)d=a.wa[b],Object.prototype.hasOwnProperty.call(e,d)||(a.wa[c++]=d,e[d]=1),b++;a.wa.length=c}}g.get=function(a,b){return Object.prototype.hasOwnProperty.call(this.Ua,a)?this.Ua[a]:b};
g.set=function(a,b){Object.prototype.hasOwnProperty.call(this.Ua,a)||(this.Ta++,this.wa.push(a));this.Ua[a]=b};g.addAll=function(a){var b;a instanceof Hi?(b=a.Wb(),a=a.qc()):(b=ab(a),a=$a(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};g.forEach=function(a,b){for(var c=this.Wb(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};g.clone=function(){return new Hi(this)};function Ki(a,b,c,d,e){this.reset(a,b,c,d,e)}Ki.prototype.Bd=null;var Li=0;Ki.prototype.reset=function(a,b,c,d,e){"number"==typeof e||Li++;d||ta();this.$b=a;this.He=b;delete this.Bd};Ki.prototype.Td=function(a){this.$b=a};function Mi(a){this.Jd=a;this.Dd=this.Nc=this.$b=this.ra=null}function Ni(a,b){this.name=a;this.value=b}Ni.prototype.toString=function(){return this.name};var Oi=new Ni("SEVERE",1E3),Pi=new Ni("WARNING",900),Qi=new Ni("INFO",800),Ri=new Ni("CONFIG",700),Si=new Ni("FINE",500),Ti=new Ni("FINEST",300);g=Mi.prototype;g.getName=function(){return this.Jd};g.getParent=function(){return this.ra};g.Cd=function(){this.Nc||(this.Nc={});return this.Nc};g.Td=function(a){this.$b=a};
function Ui(a){if(a.$b)return a.$b;if(a.ra)return Ui(a.ra);Ha("Root logger has no level set.");return null}g.log=function(a,b,c){if(a.value>=Ui(this).value)for(ga(b)&&(b=b()),a=new Ki(a,String(b),this.Jd),c&&(a.Bd=c),c="log:"+a.He,t.console&&(t.console.timeStamp?t.console.timeStamp(c):t.console.markTimeline&&t.console.markTimeline(c)),t.msWriteProfilerMark&&t.msWriteProfilerMark(c),c=this;c;){b=c;var d=a;if(b.Dd)for(var e=0,f=void 0;f=b.Dd[e];e++)f(d);c=c.getParent()}};
g.info=function(a,b){this.log(Qi,a,b)};var Vi={},Wi=null;function Xi(a){Wi||(Wi=new Mi(""),Vi[""]=Wi,Wi.Td(Ri));var b;if(!(b=Vi[a])){b=new Mi(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=Xi(a.substr(0,c));c.Cd()[d]=b;b.ra=c;Vi[a]=b}return b};function Yi(a){var b=Zi;b&&b.log(Ti,a,void 0)}function $i(a){var b=Zi;b&&b.log(Pi,a,void 0)}function aj(a,b){a&&a.log(Si,b,void 0)};var bj={1:"NativeMessagingTransport",2:"FrameElementMethodTransport",3:"IframeRelayTransport",4:"IframePollingTransport",5:"FlashTransport",6:"NixTransport",7:"DirectTransport"},cj={df:"cn",cf:"at",sf:"rat",of:"pu",gf:"ifrid",vf:"tp",jf:"lru",nf:"pru",Wd:"lpu",Xd:"ppu",mf:"ph",lf:"osh",tf:"role",kf:"nativeProtocolVersion",ff:"directSyncMode"},Zi=Xi("goog.net.xpc");function dj(a){a.prototype.then=a.prototype.then;a.prototype.$goog_Thenable=!0}function ej(a){if(!a)return!1;try{return!!a.$goog_Thenable}catch(b){return!1}};function fj(a,b,c){this.Fe=c;this.we=a;this.Re=b;this.yc=0;this.tc=null}fj.prototype.get=function(){var a;0<this.yc?(this.yc--,a=this.tc,this.tc=a.next,a.next=null):a=this.we();return a};fj.prototype.put=function(a){this.Re(a);this.yc<this.Fe&&(this.yc++,a.next=this.tc,this.tc=a)};function gj(){this.Fc=this.Jb=null}var ij=new fj(function(){return new hj},function(a){a.reset()},100);gj.prototype.add=function(a,b){var c=ij.get();c.set(a,b);this.Fc?this.Fc.next=c:this.Jb=c;this.Fc=c};gj.prototype.remove=function(){var a=null;this.Jb&&(a=this.Jb,this.Jb=this.Jb.next,this.Jb||(this.Fc=null),a.next=null);return a};function hj(){this.next=this.scope=this.Na=null}hj.prototype.set=function(a,b){this.Na=a;this.scope=b;this.next=null};
hj.prototype.reset=function(){this.next=this.scope=this.Na=null};function jj(a){t.setTimeout(function(){throw a;},0)}var kj;
function lj(){var a=t.MessageChannel;"undefined"===typeof a&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&!Xa("Presto")&&(a=function(){var a=document.createElement("IFRAME");a.style.display="none";a.src="";document.documentElement.appendChild(a);var b=a.contentWindow,a=b.document;a.open();a.write("");a.close();var c="callImmediate"+Math.random(),d="file:"==b.location.protocol?"*":b.location.protocol+"//"+b.location.host,a=sa(function(a){if(("*"==d||a.origin==d)&&a.data==
c)this.port1.onmessage()},this);b.addEventListener("message",a,!1);this.port1={};this.port2={postMessage:function(){b.postMessage(c,d)}}});if("undefined"!==typeof a&&!Xa("Trident")&&!Xa("MSIE")){var b=new a,c={},d=c;b.port1.onmessage=function(){if(ba(c.next)){c=c.next;var a=c.jd;c.jd=null;a()}};return function(a){d.next={jd:a};d=d.next;b.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in document.createElement("SCRIPT")?function(a){var b=document.createElement("SCRIPT");
b.onreadystatechange=function(){b.onreadystatechange=null;b.parentNode.removeChild(b);b=null;a();a=null};document.documentElement.appendChild(b)}:function(a){t.setTimeout(a,0)}};function mj(a,b){nj||oj();pj||(nj(),pj=!0);qj.add(a,b)}var nj;function oj(){if(t.Promise&&t.Promise.resolve){var a=t.Promise.resolve(void 0);nj=function(){a.then(rj)}}else nj=function(){var a=rj;!ga(t.setImmediate)||t.Window&&t.Window.prototype&&t.Window.prototype.setImmediate==t.setImmediate?(kj||(kj=lj()),kj(a)):t.setImmediate(a)}}var pj=!1,qj=new gj;[].push(function(){pj=!1;qj=new gj});function rj(){for(var a=null;a=qj.remove();){try{a.Na.call(a.scope)}catch(b){jj(b)}ij.put(a)}pj=!1};function sj(a,b){this.Ma=tj;this.Qa=void 0;this.ub=this.Za=this.ra=null;this.rc=this.Wc=!1;if(a!=da)try{var c=this;a.call(b,function(a){uj(c,vj,a)},function(a){if(!(a instanceof wj))try{if(a instanceof Error)throw a;throw Error("Promise rejected.");}catch(b){}uj(c,xj,a)})}catch(d){uj(this,xj,d)}}var tj=0,vj=2,xj=3;function yj(){this.next=this.context=this.Eb=this.cc=this.eb=null;this.hc=!1}yj.prototype.reset=function(){this.context=this.Eb=this.cc=this.eb=null;this.hc=!1};
var zj=new fj(function(){return new yj},function(a){a.reset()},100);function Aj(a,b,c){var d=zj.get();d.cc=a;d.Eb=b;d.context=c;return d}sj.prototype.then=function(a,b,c){return Bj(this,ga(a)?a:null,ga(b)?b:null,c)};dj(sj);sj.prototype.cancel=function(a){this.Ma==tj&&mj(function(){var b=new wj(a);Cj(this,b)},this)};
function Cj(a,b){if(a.Ma==tj)if(a.ra){var c=a.ra;if(c.Za){for(var d=0,e=null,f=null,h=c.Za;h&&(h.hc||(d++,h.eb==a&&(e=h),!(e&&1<d)));h=h.next)e||(f=h);e&&(c.Ma==tj&&1==d?Cj(c,b):(f?(d=f,d.next==c.ub&&(c.ub=d),d.next=d.next.next):Dj(c),Ej(c,e,xj,b)))}a.ra=null}else uj(a,xj,b)}function Fj(a,b){a.Za||a.Ma!=vj&&a.Ma!=xj||Gj(a);a.ub?a.ub.next=b:a.Za=b;a.ub=b}
function Bj(a,b,c,d){var e=Aj(null,null,null);e.eb=new sj(function(a,h){e.cc=b?function(c){try{var e=b.call(d,c);a(e)}catch(m){h(m)}}:a;e.Eb=c?function(b){try{var e=c.call(d,b);!ba(e)&&b instanceof wj?h(b):a(e)}catch(m){h(m)}}:h});e.eb.ra=a;Fj(a,e);return e.eb}sj.prototype.Xe=function(a){this.Ma=tj;uj(this,vj,a)};sj.prototype.Ye=function(a){this.Ma=tj;uj(this,xj,a)};
function uj(a,b,c){if(a.Ma==tj){a==c&&(b=xj,c=new TypeError("Promise cannot resolve to itself"));a.Ma=1;var d;a:{var e=c,f=a.Xe,h=a.Ye;if(e instanceof sj)Fj(e,Aj(f||da,h||null,a)),d=!0;else if(ej(e))e.then(f,h,a),d=!0;else{if(ia(e))try{var k=e.then;if(ga(k)){Hj(e,k,f,h,a);d=!0;break a}}catch(l){h.call(a,l);d=!0;break a}d=!1}}d||(a.Qa=c,a.Ma=b,a.ra=null,Gj(a),b!=xj||c instanceof wj||Ij(a,c))}}
function Hj(a,b,c,d,e){function f(a){k||(k=!0,d.call(e,a))}function h(a){k||(k=!0,c.call(e,a))}var k=!1;try{b.call(a,h,f)}catch(l){f(l)}}function Gj(a){a.Wc||(a.Wc=!0,mj(a.Be,a))}function Dj(a){var b=null;a.Za&&(b=a.Za,a.Za=b.next,b.next=null);a.Za||(a.ub=null);return b}sj.prototype.Be=function(){for(var a=null;a=Dj(this);)Ej(this,a,this.Ma,this.Qa);this.Wc=!1};
function Ej(a,b,c,d){if(c==xj&&b.Eb&&!b.hc)for(;a&&a.rc;a=a.ra)a.rc=!1;if(b.eb)b.eb.ra=null,Jj(b,c,d);else try{b.hc?b.cc.call(b.context):Jj(b,c,d)}catch(e){Kj.call(null,e)}zj.put(b)}function Jj(a,b,c){b==vj?a.cc.call(a.context,c):a.Eb&&a.Eb.call(a.context,c)}function Ij(a,b){a.rc=!0;mj(function(){a.rc&&Kj.call(null,b)})}var Kj=jj;function wj(a){wa.call(this,a)}ua(wj,wa);wj.prototype.name="cancel";function Lj(){0!=Mj&&(Nj[ja(this)]=this);this.lb=this.lb;this.zc=this.zc}var Mj=0,Nj={};Lj.prototype.lb=!1;Lj.prototype.ye=function(){if(!this.lb&&(this.lb=!0,this.kb(),0!=Mj)){var a=ja(this);delete Nj[a]}};Lj.prototype.kb=function(){if(this.zc)for(;this.zc.length;)this.zc.shift()()};var Oj=!ib||9<=tb,Pj=ib&&!rb("9");!lb||rb("528");kb&&rb("1.9b")||ib&&rb("8")||hb&&rb("9.5")||lb&&rb("528");kb&&!rb("8")||ib&&rb("9");function Qj(a,b){this.type=a;this.currentTarget=this.target=b;this.defaultPrevented=this.rb=!1;this.Qd=!0}Qj.prototype.stopPropagation=function(){this.rb=!0};Qj.prototype.preventDefault=function(){this.defaultPrevented=!0;this.Qd=!1};function Rj(a){Rj[" "](a);return a}Rj[" "]=da;function Sj(a,b){Qj.call(this,a?a.type:"");this.relatedTarget=this.currentTarget=this.target=null;this.charCode=this.keyCode=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.Vb=this.state=null;if(a){var c=this.type=a.type;this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;if(d){if(kb){var e;a:{try{Rj(d.nodeName);e=!0;break a}catch(f){}e=!1}e||(d=null)}}else"mouseover"==
c?d=a.fromElement:"mouseout"==c&&(d=a.toElement);this.relatedTarget=d;this.offsetX=lb||void 0!==a.offsetX?a.offsetX:a.layerX;this.offsetY=lb||void 0!==a.offsetY?a.offsetY:a.layerY;this.clientX=void 0!==a.clientX?a.clientX:a.pageX;this.clientY=void 0!==a.clientY?a.clientY:a.pageY;this.screenX=a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;
this.metaKey=a.metaKey;this.state=a.state;this.Vb=a;a.defaultPrevented&&this.preventDefault()}}ua(Sj,Qj);Sj.prototype.stopPropagation=function(){Sj.dc.stopPropagation.call(this);this.Vb.stopPropagation?this.Vb.stopPropagation():this.Vb.cancelBubble=!0};Sj.prototype.preventDefault=function(){Sj.dc.preventDefault.call(this);var a=this.Vb;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,Pj)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var Tj="closure_listenable_"+(1E6*Math.random()|0),Uj=0;function Vj(a,b,c,d,e){this.listener=a;this.Ac=null;this.src=b;this.type=c;this.Lb=!!d;this.sc=e;this.key=++Uj;this.Fb=this.jc=!1}function Wj(a){a.Fb=!0;a.listener=null;a.Ac=null;a.src=null;a.sc=null};function Xj(a){this.src=a;this.za={};this.ec=0}Xj.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.za[f];a||(a=this.za[f]=[],this.ec++);var h=Yj(a,b,d,e);-1<h?(b=a[h],c||(b.jc=!1)):(b=new Vj(b,this.src,f,!!d,e),b.jc=c,a.push(b));return b};Xj.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.za))return!1;var e=this.za[a];b=Yj(e,b,c,d);return-1<b?(Wj(e[b]),Ia.splice.call(e,b,1),0==e.length&&(delete this.za[a],this.ec--),!0):!1};
function Zj(a,b){var c=b.type;c in a.za&&Qa(a.za[c],b)&&(Wj(b),0==a.za[c].length&&(delete a.za[c],a.ec--))}Xj.prototype.Xc=function(a,b,c,d){a=this.za[a.toString()];var e=-1;a&&(e=Yj(a,b,c,d));return-1<e?a[e]:null};Xj.prototype.hasListener=function(a,b){var c=ba(a),d=c?a.toString():"",e=ba(b);return Za(this.za,function(a){for(var h=0;h<a.length;++h)if(!(c&&a[h].type!=d||e&&a[h].Lb!=b))return!0;return!1})};
function Yj(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.Fb&&f.listener==b&&f.Lb==!!c&&f.sc==d)return e}return-1};var ak="closure_lm_"+(1E6*Math.random()|0),bk={},ck=0;
function dk(a,b,c,d,e){if("array"==y(b))for(var f=0;f<b.length;f++)dk(a,b[f],c,d,e);else if(c=ek(c),a&&a[Tj])a.Ha.add(String(b),c,!1,d,e);else{if(!b)throw Error("Invalid event type");var f=!!d,h=fk(a);h||(a[ak]=h=new Xj(a));c=h.add(b,c,!1,d,e);if(!c.Ac){d=gk();c.Ac=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,f);else if(a.attachEvent)a.attachEvent(hk(b.toString()),d);else throw Error("addEventListener and attachEvent are unavailable.");ck++}}}
function gk(){var a=ik,b=Oj?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b}function jk(a,b,c,d,e){if("array"==y(b))for(var f=0;f<b.length;f++)jk(a,b[f],c,d,e);else c=ek(c),a&&a[Tj]?a.Ha.remove(String(b),c,d,e):a&&(a=fk(a))&&(b=a.Xc(b,c,!!d,e))&&kk(b)}
function kk(a){if("number"!=typeof a&&a&&!a.Fb){var b=a.src;if(b&&b[Tj])Zj(b.Ha,a);else{var c=a.type,d=a.Ac;b.removeEventListener?b.removeEventListener(c,d,a.Lb):b.detachEvent&&b.detachEvent(hk(c),d);ck--;(c=fk(b))?(Zj(c,a),0==c.ec&&(c.src=null,b[ak]=null)):Wj(a)}}}function hk(a){return a in bk?bk[a]:bk[a]="on"+a}function lk(a,b,c,d){var e=!0;if(a=fk(a))if(b=a.za[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.Lb==c&&!f.Fb&&(f=mk(f,d),e=e&&!1!==f)}return e}
function mk(a,b){var c=a.listener,d=a.sc||a.src;a.jc&&kk(a);return c.call(d,b)}
function ik(a,b){if(a.Fb)return!0;if(!Oj){var c;if(!(c=b))a:{c=["window","event"];for(var d=t,e;e=c.shift();)if(null!=d[e])d=d[e];else{c=null;break a}c=d}e=c;c=new Sj(e,this);d=!0;if(!(0>e.keyCode||void 0!=e.returnValue)){a:{var f=!1;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(l){f=!0}if(f||void 0==e.returnValue)e.returnValue=!0}e=[];for(f=c.currentTarget;f;f=f.parentNode)e.push(f);for(var f=a.type,h=e.length-1;!c.rb&&0<=h;h--){c.currentTarget=e[h];var k=lk(e[h],f,!0,c),d=d&&k}for(h=0;!c.rb&&h<
e.length;h++)c.currentTarget=e[h],k=lk(e[h],f,!1,c),d=d&&k}return d}return mk(a,new Sj(b,this))}function fk(a){a=a[ak];return a instanceof Xj?a:null}var nk="__closure_events_fn_"+(1E9*Math.random()>>>0);function ek(a){if(ga(a))return a;a[nk]||(a[nk]=function(b){return a.handleEvent(b)});return a[nk]};function ok(){Lj.call(this);this.Ha=new Xj(this);this.Yd=this;this.$c=null}ua(ok,Lj);ok.prototype[Tj]=!0;g=ok.prototype;g.addEventListener=function(a,b,c,d){dk(this,a,b,c,d)};g.removeEventListener=function(a,b,c,d){jk(this,a,b,c,d)};
g.dispatchEvent=function(a){var b,c=this.$c;if(c)for(b=[];c;c=c.$c)b.push(c);var c=this.Yd,d=a.type||a;if(fa(a))a=new Qj(a,c);else if(a instanceof Qj)a.target=a.target||c;else{var e=a;a=new Qj(d,c);cb(a,e)}var e=!0,f;if(b)for(var h=b.length-1;!a.rb&&0<=h;h--)f=a.currentTarget=b[h],e=pk(f,d,!0,a)&&e;a.rb||(f=a.currentTarget=c,e=pk(f,d,!0,a)&&e,a.rb||(e=pk(f,d,!1,a)&&e));if(b)for(h=0;!a.rb&&h<b.length;h++)f=a.currentTarget=b[h],e=pk(f,d,!1,a)&&e;return e};
g.kb=function(){ok.dc.kb.call(this);if(this.Ha){var a=this.Ha,b=0,c;for(c in a.za){for(var d=a.za[c],e=0;e<d.length;e++)++b,Wj(d[e]);delete a.za[c];a.ec--}}this.$c=null};function pk(a,b,c,d){b=a.Ha.za[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var h=b[f];if(h&&!h.Fb&&h.Lb==c){var k=h.listener,l=h.sc||h.src;h.jc&&Zj(a.Ha,h);e=!1!==k.call(l,d)&&e}}return e&&0!=d.Qd}g.Xc=function(a,b,c,d){return this.Ha.Xc(String(a),b,c,d)};
g.hasListener=function(a,b){return this.Ha.hasListener(ba(a)?String(a):void 0,b)};function qk(a,b,c){if(ga(a))c&&(a=sa(a,c));else if(a&&"function"==typeof a.handleEvent)a=sa(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<b?-1:t.setTimeout(a,b||0)};function rk(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};function sk(){}sk.prototype.hd=null;function tk(a){var b;(b=a.hd)||(b={},uk(a)&&(b[0]=!0,b[1]=!0),b=a.hd=b);return b};var vk;function wk(){}ua(wk,sk);function xk(a){return(a=uk(a))?new ActiveXObject(a):new XMLHttpRequest}function uk(a){if(!a.Ed&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.Ed=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.Ed}vk=new wk;var yk=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function zk(a){if(Ak){Ak=!1;var b=t.location;if(b){var c=b.href;if(c&&(c=(c=zk(c)[3]||null)?decodeURI(c):c)&&c!=b.hostname)throw Ak=!0,Error();}}return a.match(yk)}var Ak=lb;function Bk(a){ok.call(this);this.headers=new Hi;this.Hc=a||null;this.Xa=!1;this.Gc=this.H=null;this.Zb=this.Gd=this.xc="";this.pb=this.Yc=this.vc=this.Vc=!1;this.Hb=0;this.Cc=null;this.Pd=Ck;this.Ec=this.$e=!1}ua(Bk,ok);var Ck="";Bk.prototype.Ka=Xi("goog.net.XhrIo");var Dk=/^https?$/i,Ek=["POST","PUT"],Fk=[];g=Bk.prototype;g.ae=function(){this.ye();Qa(Fk,this)};
g.send=function(a,b,c,d){if(this.H)throw Error("[goog.net.XhrIo] Object is active with another request\x3d"+this.xc+"; newUri\x3d"+a);b=b?b.toUpperCase():"GET";this.xc=a;this.Zb="";this.Gd=b;this.Vc=!1;this.Xa=!0;this.H=this.Hc?xk(this.Hc):xk(vk);this.Gc=this.Hc?tk(this.Hc):tk(vk);this.H.onreadystatechange=sa(this.Ld,this);try{aj(this.Ka,Gk(this,"Opening Xhr")),this.Yc=!0,this.H.open(b,String(a),!0),this.Yc=!1}catch(f){aj(this.Ka,Gk(this,"Error opening Xhr: "+f.message));this.pc(5,f);return}a=c||
"";var e=this.headers.clone();d&&Gi(d,function(a,b){e.set(b,a)});d=Oa(e.Wb());c=t.FormData&&a instanceof t.FormData;!(0<=Ja(Ek,b))||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset\x3dutf-8");e.forEach(function(a,b){this.H.setRequestHeader(b,a)},this);this.Pd&&(this.H.responseType=this.Pd);"withCredentials"in this.H&&(this.H.withCredentials=this.$e);try{Hk(this),0<this.Hb&&(this.Ec=Ik(this.H),aj(this.Ka,Gk(this,"Will abort after "+this.Hb+"ms if incomplete, xhr2 "+this.Ec)),this.Ec?
(this.H.timeout=this.Hb,this.H.ontimeout=sa(this.Ud,this)):this.Cc=qk(this.Ud,this.Hb,this)),aj(this.Ka,Gk(this,"Sending request")),this.vc=!0,this.H.send(a),this.vc=!1}catch(f){aj(this.Ka,Gk(this,"Send error: "+f.message)),this.pc(5,f)}};function Ik(a){return ib&&rb(9)&&"number"==typeof a.timeout&&ba(a.ontimeout)}function Pa(a){return"content-type"==a.toLowerCase()}
g.Ud=function(){"undefined"!=typeof aa&&this.H&&(this.Zb="Timed out after "+this.Hb+"ms, aborting",aj(this.Ka,Gk(this,this.Zb)),this.dispatchEvent("timeout"),this.abort(8))};g.pc=function(a,b){this.Xa=!1;this.H&&(this.pb=!0,this.H.abort(),this.pb=!1);this.Zb=b;Jk(this);Kk(this)};function Jk(a){a.Vc||(a.Vc=!0,a.dispatchEvent("complete"),a.dispatchEvent("error"))}
g.abort=function(){this.H&&this.Xa&&(aj(this.Ka,Gk(this,"Aborting")),this.Xa=!1,this.pb=!0,this.H.abort(),this.pb=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Kk(this))};g.kb=function(){this.H&&(this.Xa&&(this.Xa=!1,this.pb=!0,this.H.abort(),this.pb=!1),Kk(this,!0));Bk.dc.kb.call(this)};g.Ld=function(){this.lb||(this.Yc||this.vc||this.pb?Lk(this):this.Je())};g.Je=function(){Lk(this)};
function Lk(a){if(a.Xa&&"undefined"!=typeof aa)if(a.Gc[1]&&4==Mk(a)&&2==a.getStatus())aj(a.Ka,Gk(a,"Local request error detected and ignored"));else if(a.vc&&4==Mk(a))qk(a.Ld,0,a);else if(a.dispatchEvent("readystatechange"),4==Mk(a)){aj(a.Ka,Gk(a,"Request complete"));a.Xa=!1;try{var b=a.getStatus(),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=!0;break a;default:c=!1}var d;if(!(d=c)){var e;if(e=0===b){var f=zk(String(a.xc))[1]||null;if(!f&&t.self&&t.self.location)var h=
t.self.location.protocol,f=h.substr(0,h.length-1);e=!Dk.test(f?f.toLowerCase():"")}d=e}if(d)a.dispatchEvent("complete"),a.dispatchEvent("success");else{var k;try{k=2<Mk(a)?a.H.statusText:""}catch(l){aj(a.Ka,"Can not get status: "+l.message),k=""}a.Zb=k+" ["+a.getStatus()+"]";Jk(a)}}finally{Kk(a)}}}
function Kk(a,b){if(a.H){Hk(a);var c=a.H,d=a.Gc[0]?da:null;a.H=null;a.Gc=null;b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(e){(c=a.Ka)&&c.log(Oi,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}}function Hk(a){a.H&&a.Ec&&(a.H.ontimeout=null);"number"==typeof a.Cc&&(t.clearTimeout(a.Cc),a.Cc=null)}function Mk(a){return a.H?a.H.readyState:0}g.getStatus=function(){try{return 2<Mk(this)?this.H.status:-1}catch(a){return-1}};
g.getResponseHeader=function(a){return this.H&&4==Mk(this)?this.H.getResponseHeader(a):void 0};g.getAllResponseHeaders=function(){return this.H&&4==Mk(this)?this.H.getAllResponseHeaders():""};function Gk(a,b){return b+" ["+a.Gd+" "+a.xc+" "+a.getStatus()+"]"};/*
 Portions of this code are from MochiKit, received by
 The Closure Authors under the MIT license. All other code is Copyright
 2005-2009 The Closure Authors. All Rights Reserved.
*/
function Nk(a,b){this.Va=[];this.Kd=a;this.Ad=b||null;this.Ab=this.nb=!1;this.Qa=void 0;this.ed=this.Zd=this.Kc=!1;this.Dc=0;this.ra=null;this.Lc=0}Nk.prototype.cancel=function(a){if(this.nb)this.Qa instanceof Nk&&this.Qa.cancel();else{if(this.ra){var b=this.ra;delete this.ra;a?b.cancel(a):(b.Lc--,0>=b.Lc&&b.cancel())}this.Kd?this.Kd.call(this.Ad,this):this.ed=!0;this.nb||this.Ae()}};Nk.prototype.yd=function(a,b){this.Kc=!1;this.nb=!0;this.Qa=b;this.Ab=!a;Ok(this)};
Nk.prototype.Ae=function(){var a=new Pk;if(this.nb){if(!this.ed)throw new Qk;this.ed=!1}this.nb=!0;this.Qa=a;this.Ab=!0;Ok(this)};function Rk(a,b,c){a.Va.push([b,c,void 0]);a.nb&&Ok(a)}Nk.prototype.then=function(a,b,c){var d,e,f=new sj(function(a,b){d=a;e=b});Rk(this,d,function(a){a instanceof Pk?f.cancel():e(a)});return f.then(a,b,c)};dj(Nk);function Sk(a){return Na(a.Va,function(a){return ga(a[1])})}
function Ok(a){if(a.Dc&&a.nb&&Sk(a)){var b=a.Dc,c=Tk[b];c&&(t.clearTimeout(c.uc),delete Tk[b]);a.Dc=0}a.ra&&(a.ra.Lc--,delete a.ra);for(var b=a.Qa,d=c=!1;a.Va.length&&!a.Kc;){var e=a.Va.shift(),f=e[0],h=e[1],e=e[2];if(f=a.Ab?h:f)try{var k=f.call(e||a.Ad,b);ba(k)&&(a.Ab=a.Ab&&(k==b||k instanceof Error),a.Qa=b=k);if(ej(b)||"function"===typeof t.Promise&&b instanceof t.Promise)d=!0,a.Kc=!0}catch(l){b=l,a.Ab=!0,Sk(a)||(c=!0)}}a.Qa=b;d&&(k=sa(a.yd,a,!0),d=sa(a.yd,a,!1),b instanceof Nk?(Rk(b,k,d),b.Zd=
!0):b.then(k,d));c&&(b=new Uk(b),Tk[b.uc]=b,a.Dc=b.uc)}function Qk(){wa.call(this)}ua(Qk,wa);Qk.prototype.message="Deferred has already fired";Qk.prototype.name="AlreadyCalledError";function Pk(){wa.call(this)}ua(Pk,wa);Pk.prototype.message="Deferred was canceled";Pk.prototype.name="CanceledError";function Uk(a){this.uc=t.setTimeout(sa(this.Ve,this),0);this.pc=a}Uk.prototype.Ve=function(){delete Tk[this.uc];throw this.pc;};var Tk={};function Vk(a){Lj.call(this);a||(a=xa||(xa=new yb));this.ze=a}ua(Vk,Lj);Vk.prototype.fd=0;Vk.prototype.getType=function(){return this.fd};Vk.prototype.ab=function(){return this.ze.ab()};Vk.prototype.getName=function(){return bj[String(this.fd)]||""};function Wk(a,b){Vk.call(this,b);this.$=a;this.cd=this.$.Ce()[cj.Xd];this.Qe=this.$.Ce()[cj.Wd];this.Bc=[]}var Xk,Yk;ua(Wk,Vk);g=Wk.prototype;g.Me=5;g.fd=4;g.Va=0;g.Ib=!1;g.wc=!1;g.Od=null;function Zk(a){return"googlexpc_"+a.$.name+"_msg"}function $k(a){return"googlexpc_"+a.$.name+"_ack"}function al(a){try{if(!a.lb&&a.$.Ee())return a.$.Kf().frames||{}}catch(b){aj(Zi,"error retrieving peer frames")}return{}}function bl(a,b){return al(a)[b]}
g.connect=function(){if(!this.lb&&this.$.Ee()){aj(Zi,"transport connect called");if(!this.wc){aj(Zi,"initializing...");var a=Zk(this);this.Db=cl(this,a);this.Zc=this.ab().frames[a];a=$k(this);this.tb=cl(this,a);this.Jc=this.ab().frames[a];this.wc=!0}if(dl(this,Zk(this))&&dl(this,$k(this)))aj(Zi,"foreign frames present"),this.Hd=new el(this,bl(this,Zk(this)),sa(this.Pe,this)),this.gd=new el(this,bl(this,$k(this)),sa(this.Oe,this)),this.ld();else{Yi("foreign frames not (yet) present");if(1==this.$.De()){if(!(this.Od||
0<this.Me--)){Yi("Inner peer reconnect triggered.");for(var b=10,a="";0<b--;)a+="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(62*Math.random()));this.$.Nf(a);Yi("switching channels: "+this.$.name);fl(this);this.wc=!1;this.Od=cl(this,"googlexpc_reconnect_"+this.$.name)}}else if(0==this.$.De()){Yi("outerPeerReconnect called");for(var a=al(this),c=a.length,d=0;d<c;d++){try{a[d]&&a[d].name&&(b=a[d].name)}catch(f){}if(b){var e=b.split("_");if(3==e.length&&"googlexpc"==
e[0]&&"reconnect"==e[1]){this.$.name=e[2];fl(this);this.wc=!1;break}}}}this.ab().setTimeout(sa(this.connect,this),100)}}};function cl(a,b){Yi("constructing sender frame: "+b);var c;c=document.createElement("IFRAME");var d=c.style;d.position="absolute";d.top="-10px";d.left="10px";d.width="1px";d.height="1px";c.id=c.name=b;c.src=a.cd+"#INITIAL";a.ab().document.body.appendChild(c);return c}
function fl(a){Yi("deconstructSenderFrames called");a.Db&&(a.Db.parentNode.removeChild(a.Db),a.Db=null,a.Zc=null);a.tb&&(a.tb.parentNode.removeChild(a.tb),a.tb=null,a.Jc=null)}function dl(a,b){Yi("checking for receive frame: "+b);try{var c=bl(a,b);if(!c||0!=c.location.href.indexOf(a.Qe))return!1}catch(d){return!1}return!0}
g.ld=function(){var a=al(this);a[$k(this)]&&a[Zk(this)]?(this.Id=new gl(this.cd,this.Zc),this.gc=new gl(this.cd,this.Jc),aj(Zi,"local frames ready"),this.ab().setTimeout(sa(function(){this.Id.send("SETUP");this.Ib=!0;aj(Zi,"SETUP sent")},this),100)):(this.kd||(this.kd=sa(this.ld,this)),this.ab().setTimeout(this.kd,100),aj(Zi,"local frames not (yet) present"))};
function hl(a){if(a.dd&&a.Nd){if(a.$.Lf(),a.yb){aj(Zi,"delivering queued messages ("+a.yb.length+")");for(var b=0,c;b<a.yb.length;b++)c=a.yb[b],a.$.af(c.Ue,c.Le);delete a.yb}}else Yi("checking if connected: ack sent:"+a.dd+", ack rcvd: "+a.Nd)}
g.Pe=function(a){Yi("msg received: "+a);if("SETUP"==a)this.gc&&(this.gc.send("SETUP_ACK"),Yi("SETUP_ACK sent"),this.dd=!0,hl(this));else if(this.$.Fd()||this.dd){var b=a.indexOf("|"),c=a.substring(0,b);a=a.substring(b+1);b=c.indexOf(",");if(-1==b){var d;this.gc.send("ACK:"+c);il(this,a)}else d=c.substring(0,b),this.gc.send("ACK:"+d),c=c.substring(b+1).split("/"),b=parseInt(c[0],10),c=parseInt(c[1],10),1==b&&(this.ad=[]),this.ad.push(a),b==c&&(il(this,this.ad.join("")),delete this.ad)}else $i("received msg, but channel is not connected")};
g.Oe=function(a){Yi("ack received: "+a);"SETUP_ACK"==a?(this.Ib=!1,this.Nd=!0,hl(this)):this.$.Fd()?this.Ib?parseInt(a.split(":")[1],10)==this.Va?(this.Ib=!1,jl(this)):$i("got ack with wrong sequence"):$i("got unexpected ack"):$i("received ack, but channel not connected")};function jl(a){if(!a.Ib&&a.Bc.length){var b=a.Bc.shift();++a.Va;a.Id.send(a.Va+b);Yi("msg sent: "+a.Va+b);a.Ib=!0}}
function il(a,b){var c=b.indexOf(":"),d=b.substr(0,c),c=b.substring(c+1);a.$.Fd()?a.$.af(d,c):((a.yb||(a.yb=[])).push({Ue:d,Le:c}),Yi("queued delivery"))}g.fc=3800;g.send=function(a,b){var c=a+":"+b;if(!ib||b.length<=this.fc)this.Bc.push("|"+c);else for(var d=b.length,e=Math.ceil(d/this.fc),f=0,h=1;f<d;)this.Bc.push(","+h+"/"+e+"|"+c.substr(f,this.fc)),h++,f+=this.fc;jl(this)};
g.kb=function(){Wk.dc.kb.call(this);var a=kl;Qa(a,this.Hd);Qa(a,this.gd);this.Hd=this.gd=null;xb(this.Db);xb(this.tb);this.Zc=this.Jc=this.Db=this.tb=null};
var kl=[],ll=sa(function(){var a=kl,b,c=!1;try{for(var d=0;b=a[d];d++){var e;if(!(e=c)){var f=b,h=f.Md.location.href;if(h!=f.zd){f.zd=h;var k=h.split("#")[1];k&&(k=k.substr(1),f.$d(decodeURIComponent(k)));e=!0}else e=!1}c=e}}catch(l){if(Zi&&Zi.info("receive_() failed: "+l,void 0),b.We.$.Mf(),!a.length)return}a=ta();c&&(Xk=a);Yk=window.setTimeout(ll,1E3>a-Xk?10:100)},Wk);function ml(){aj(Zi,"starting receive-timer");Xk=ta();Yk&&window.clearTimeout(Yk);Yk=window.setTimeout(ll,10)}
function gl(a,b){if(!/^https?:\/\//.test(a))throw Error("URL "+a+" is invalid");this.Se=a;this.Sd=b;this.Tc=0}gl.prototype.send=function(a){this.Tc=++this.Tc%2;a=this.Se+"#"+this.Tc+encodeURIComponent(a);try{lb?this.Sd.location.href=a:this.Sd.location.replace(a)}catch(b){Zi&&Zi.log(Oi,"sending failed",b)}ml()};function el(a,b,c){this.We=a;this.Md=b;this.$d=c;this.zd=this.Md.location.href.split("#")[0]+"#INITIAL";kl.push(this);ml()};Xi("goog.net.WebSocket");xf.b(gf,He.b(function(a){var b=P(a,0);a=P(a,1);return new Q(null,2,5,U,[Re.a(b.toLowerCase()),a],null)},Lg(vd([function(a){return jh(a)}({ef:"complete",uf:"success",ERROR:"error",bf:"abort",qf:"ready",rf:"readystatechange",TIMEOUT:"timeout",hf:"incrementaldata",pf:"progress"})],0))));
var nl=function nl(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return nl.b(arguments[0],arguments[1]);case 3:return nl.c(arguments[0],arguments[1],arguments[2]);case 4:return nl.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return nl.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);case 6:return nl.I(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);default:throw Error([F("Invalid arity: "),
F(c.length)].join(""));}};nl.b=function(a,b){if(null!=a&&null!=a.td)return a.td(0,b);var c=nl[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=nl._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IConnection.transmit",a);};nl.c=function(a,b,c){if(null!=a&&null!=a.ud)return a.ud(0,b,c);var d=nl[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=nl._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IConnection.transmit",a);};
nl.m=function(a,b,c,d){if(null!=a&&null!=a.vd)return a.vd(0,b,c,d);var e=nl[y(null==a?null:a)];if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);e=nl._;if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);throw D("IConnection.transmit",a);};
nl.w=function(a,b,c,d,e){if(null!=a&&null!=a.wd)return a.wd(0,b,c,d,e);var f=nl[y(null==a?null:a)];if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);f=nl._;if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);throw D("IConnection.transmit",a);};
nl.I=function(a,b,c,d,e,f){if(null!=a&&null!=a.xd)return a.xd(0,b,c,d,e,f);var h=nl[y(null==a?null:a)];if(null!=h)return h.I?h.I(a,b,c,d,e,f):h.call(null,a,b,c,d,e,f);h=nl._;if(null!=h)return h.I?h.I(a,b,c,d,e,f):h.call(null,a,b,c,d,e,f);throw D("IConnection.transmit",a);};nl.A=6;g=Bk.prototype;g.td=function(a,b){return nl.I(this,b,"GET",null,null,1E4)};g.ud=function(a,b,c){return nl.I(this,b,c,null,null,1E4)};g.vd=function(a,b,c,d){return nl.I(this,b,c,d,null,1E4)};
g.wd=function(a,b,c,d,e){return nl.I(this,b,c,d,e,1E4)};g.xd=function(a,b,c,d,e,f){this.Hb=Math.max(0,f);return this.send(b,c,d,e)};xf.b(gf,He.b(function(a){var b=P(a,0);a=P(a,1);return new Q(null,2,5,U,[Re.a(b.toLowerCase()),a],null)},jh(cj)));var ol=V.a?V.a(null):V.call(null,null),pl=[];function ql(a){pl.push(pf.s(vd([a],0)));a=M.a?M.a(ol):M.call(null,ol);if(A(a)){for(var b=I(pl),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e);nl.c(a,Lh,f);e+=1}else if(b=I(b))c=b,re(c)?(b=Wc(c),e=Xc(c),c=b,d=O(b),b=e):(b=K(c),nl.c(a,Lh,b),b=L(c),c=null,d=0),e=0;else break;if("array"!=y(pl))for(a=pl.length-1;0<=a;a--)delete pl[a];pl.length=0;a=void 0}else a=null;return a}Db=Cb=ql;V.a?V.a(0):V.call(null,0);function rl(a,b,c){var d=P(c,0);c=P(c,1);var e=new Bk;Fk.push(e);b&&e.Ha.add("complete",b,!1,void 0,void 0);e.Ha.add("ready",e.ae,!0,void 0,void 0);e.send(a,"POST",d,c);return e}
var sl,tl=new Hb(null,6,[zh,null,Kh,null,Qh,null,Ah,"2015-05-01",Eh,moment().format("YYYY-MM-DD"),Rh,new Hb(null,5,[Sh,new Hb(null,2,[Dh,"#ff0000",bi,!0],null),ei,new Hb(null,2,[Dh,"#ffdd00",bi,!0],null),ci,new Hb(null,2,[Dh,"#0000ff",bi,!0],null),Xh,new Hb(null,2,[Dh,"#00ff00",bi,!0],null),Oh,new Hb(null,2,[Dh,"#000000",bi,!0],null)],null)],null);sl=V.a?V.a(tl):V.call(null,tl);var ul=document.getElementById("base-url").getAttribute("value");
function vl(a,b,c,d,e){a=new google.maps.Circle({strokeColor:d,strokeOpacity:1,strokeWeight:2,fillColor:d,fillOpacity:1,map:a,center:{lat:b,lng:c},radius:10});a.addListener("click",e);return a}function wl(a,b){return yf(function(a){return null!=a.point?a.point.setMap(b):null},a)}
function xl(a){yf(function(b){var c=zf(function(a){return md.b(a.status,Ie(pc(b)))},zh.a(M.a?M.a(a):M.call(null,a))),d=bi.a(qc(b));return A(d)?wl(c,Qh.a(M.a?M.a(a):M.call(null,a))):wl(c,null)},Rh.a(M.a?M.a(a):M.call(null,a)))}function yl(a){var b=Date.parse(Eh.a(M.a?M.a(a):M.call(null,a)))+864E5;a=zf(function(a){return function(b){return b.timestamp_created>=a}}(b),zh.a(M.a?M.a(a):M.call(null,a)));return wl(a,null)}function zl(a){xl(a);return yl(a)}
function Al(a,b){var c=[F(ul),F("orders-since-date")].join(""),d=function(){var a=fh(new Hb(null,1,[Bh,b],null));return JSON.stringify(a)}(),e=fh(new Hb(null,1,["Content-Type","application/json"],null));return rl(c,function(b,c,d){return function(e){e=e.target;var m;m=e.H?rk(e.H.responseText):void 0;var n=m.orders;wl(zh.a(M.a?M.a(a):M.call(null,a)),null);tf.m(a,ge,zh,n);yf(function(b,c,d,e,f,h){return function(k){return k.point=vl(Qh.a(M.a?M.a(a):M.call(null,a)),k.lat,k.lng,Af(M.a?M.a(a):M.call(null,
a),new Q(null,3,5,U,[Rh,Re.a(k.status),Dh],null)),function(){return function(){return console.log([F("timestamp_created: "),F(new Date(k.timestamp_created))].join(""))}}(b,c,d,e,f,h))}}(e,m,n,b,c,d),zh.a(M.a?M.a(a):M.call(null,a)));yf(function(){return function(a){return a.timestamp_created=Date.parse(a.timestamp_created)}}(e,m,n,b,c,d),zh.a(M.a?M.a(a):M.call(null,a)));return zl(a)}}(c,d,e),vd([d,e],0))}
function Bl(a){var b=Ei(vd([new Q(null,2,5,U,[Yh,new Hb(null,5,[Jh,"checkbox",Gh,"orders",Hh,"orders",Uh,"orders-checkbox",Vh,!0],null)],null)],0)),c=Ei(vd([new Q(null,5,5,U,[Ph,new Hb(null,1,[Uh,"setCenterText"],null),b,a,new Q(null,2,5,U,[Ph,new Hb(null,1,[Nh,[F("height: 10px;"),F(" width: 10px;"),F(" display: inline-block;"),F(" float: right;"),F(" border-radius: 10px;"),F(" margin-top: 7px;"),F(" margin-left: 5px;"),F(" background-color: "),F(Af(M.a?M.a(sl):M.call(null,sl),new Q(null,3,5,U,[Rh,
Re.a(a),Dh],null)))].join("")],null)],null)],null)],0));b.addEventListener("click",function(b){return function(){A(b.checked)?tf.m(sl,Bf,new Q(null,3,5,U,[Rh,Re.a(a),bi],null),!0):tf.m(sl,Bf,new Q(null,3,5,U,[Rh,Re.a(a),bi],null),!1);return zl(sl)}}(b,c));return c}
function Cl(){return Ei(vd([new Q(null,2,5,U,[Ph,new Q(null,3,5,U,[Ph,new Hb(null,2,[Uh,"setCenterUI",Mh,"Select order status"],null),He.b(function(a){return Bl(a)},kd("unassigned","enroute","servicing","complete","cancelled"))],null)],null)],0))}
function Dl(){function a(a){return Ei(vd([new Q(null,2,5,U,[Yh,new Hb(null,4,[Jh,"text",Gh,"orders-date",Uh,"date-picker",Hh,a],null)],null)],0))}var b=function(){return function(a,b){return new Pikaday({field:a,format:"YYYY-MM-DD",onSelect:b})}}(a),c=a(Ah.a(M.a?M.a(sl):M.call(null,sl))),d=b(c,function(a,b,c){return function(){return Al(sl,c.value)}}(a,b,c)),e=a(Eh.a(M.a?M.a(sl):M.call(null,sl)));b(e,function(a,b,c,d,e){return function(){tf.m(sl,ge,Eh,e.value);return zl(sl)}}(a,b,c,d,e));return Ei(vd([new Q(null,
2,5,U,[Ph,new Q(null,3,5,U,[Ph,new Hb(null,2,[Uh,"setCenterUI",Mh,"Click to change dates"],null),new Q(null,9,5,U,[Ph,new Hb(null,1,[Uh,"setCenterText"],null),"Orders",new Q(null,1,5,U,[Wh],null),"From: ",c,new Q(null,1,5,U,[Wh],null),"To:   ",e],null)],null)],null)],0))}
function El(){tf.m(sl,ge,Qh,new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:16}));var a=Qh.a(M.a?M.a(sl):M.call(null,sl)),b=Ei(vd([new Q(null,3,5,U,[Ph,Dl(),Cl()],null)],0));a.controls[google.maps.ControlPosition.LEFT_TOP].push(b);return Al(sl,Ah.a(M.a?M.a(sl):M.call(null,sl)))}var Fl=["dashboard_cljs","core","init_map"],Gl=t;Fl[0]in Gl||!Gl.execScript||Gl.execScript("var "+Fl[0]);
for(var Hl;Fl.length&&(Hl=Fl.shift());)!Fl.length&&ba(El)?Gl[Hl]=El:Gl=Gl[Hl]?Gl[Hl]:Gl[Hl]={};