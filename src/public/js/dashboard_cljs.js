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
/**
 * @license
 *
 * Copyright 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Map Label.
 *
 * @author Luke Mahe (lukem@google.com),
 *         Chris Broadfoot (cbro@google.com)
 */

/**
 * Creates a new Map Label
 * @constructor
 * @extends google.maps.OverlayView
 * @param {Object.<string, *>=} opt_options Optional properties to set.
 */
function MapLabel(opt_options) {

  if (!MapLabel.prototype.setValues) {
      // Copy the properties over.
      for (var prop in google.maps.OverlayView.prototype) {
          MapLabel.prototype[prop] = google.maps.OverlayView.prototype[prop];
      }
  }
  this.set('fontFamily', 'sans-serif');
  this.set('fontSize', 12);
  this.set('fontColor', '#000000');
  this.set('strokeWeight', 4);
  this.set('strokeColor', '#ffffff');
  this.set('align', 'center');

  this.set('zIndex', 1e3);

  this.setValues(opt_options);
}
//MapLabel.prototype = new google.maps.OverlayView;

window['MapLabel'] = MapLabel;


/** @inheritDoc */
MapLabel.prototype.changed = function(prop) {
  switch (prop) {
    case 'fontFamily':
    case 'fontSize':
    case 'fontColor':
    case 'strokeWeight':
    case 'strokeColor':
    case 'align':
    case 'text':
      return this.drawCanvas_();
    case 'maxZoom':
    case 'minZoom':
    case 'position':
      return this.draw();
  }
};

/**
 * Draws the label to the canvas 2d context.
 * @private
 */
MapLabel.prototype.drawCanvas_ = function() {
  var canvas = this.canvas_;
  if (!canvas) return;

  var style = canvas.style;
  style.zIndex = /** @type number */(this.get('zIndex'));

  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = this.get('strokeColor');
  ctx.fillStyle = this.get('fontColor');
  ctx.font = this.get('fontSize') + 'px ' + this.get('fontFamily');

  var strokeWeight = Number(this.get('strokeWeight'));

  var text = this.get('text');
  if (text) {
    if (strokeWeight) {
      ctx.lineWidth = strokeWeight;
      ctx.strokeText(text, strokeWeight, strokeWeight);
    }

    ctx.fillText(text, strokeWeight, strokeWeight);

    var textMeasure = ctx.measureText(text);
    var textWidth = textMeasure.width + strokeWeight;
    style.marginLeft = this.getMarginLeft_(textWidth) + 'px';
    // Bring actual text top in line with desired latitude.
    // Cheaper than calculating height of text.
    style.marginTop = '-0.4em';
  }
};

/**
 * @inheritDoc
 */
MapLabel.prototype.onAdd = function() {
  var canvas = this.canvas_ = document.createElement('canvas');
  var style = canvas.style;
  style.position = 'absolute';

  var ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'top';

  this.drawCanvas_();

  var panes = this.getPanes();
  if (panes) {
    panes.mapPane.appendChild(canvas);
  }
};
MapLabel.prototype['onAdd'] = MapLabel.prototype.onAdd;

/**
 * Gets the appropriate margin-left for the canvas.
 * @private
 * @param {number} textWidth  the width of the text, in pixels.
 * @return {number} the margin-left, in pixels.
 */
MapLabel.prototype.getMarginLeft_ = function(textWidth) {
  switch (this.get('align')) {
    case 'left':
      return 0;
    case 'right':
      return -textWidth;
  }
  return textWidth / -2;
};

/**
 * @inheritDoc
 */
MapLabel.prototype.draw = function() {
  var projection = this.getProjection();

  if (!projection) {
    // The map projection is not ready yet so do nothing
    return;
  }

  if (!this.canvas_) {
    // onAdd has not been called yet.
    return;
  }

  var latLng = /** @type {google.maps.LatLng} */ (this.get('position'));
  if (!latLng) {
    return;
  }
  var pos = projection.fromLatLngToDivPixel(latLng);

  var style = this.canvas_.style;

  style['top'] = pos.y + 'px';
  style['left'] = pos.x + 'px';

  style['visibility'] = this.getVisible_();
};
MapLabel.prototype['draw'] = MapLabel.prototype.draw;

/**
 * Get the visibility of the label.
 * @private
 * @return {string} blank string if visible, 'hidden' if invisible.
 */
MapLabel.prototype.getVisible_ = function() {
  var minZoom = /** @type number */(this.get('minZoom'));
  var maxZoom = /** @type number */(this.get('maxZoom'));

  if (minZoom === undefined && maxZoom === undefined) {
    return '';
  }

  var map = this.getMap();
  if (!map) {
    return '';
  }

  var mapZoom = map.getZoom();
  if (mapZoom < minZoom || mapZoom > maxZoom) {
    return 'hidden';
  }
  return '';
};

/**
 * @inheritDoc
 */
MapLabel.prototype.onRemove = function() {
  var canvas = this.canvas_;
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
};
MapLabel.prototype['onRemove'] = MapLabel.prototype.onRemove;

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

var h,ba=ba||{},ca=this;function ea(a,b){var c=a.split("."),d=ca;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)c.length||void 0===b?d=d[e]?d[e]:d[e]={}:d[e]=b}function fa(){}
function t(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function ha(a){var b=t(a);return"array"==b||"object"==b&&"number"==typeof a.length}function ia(a){return"string"==typeof a}function ka(a){return"function"==t(a)}function la(a){return a[na]||(a[na]=++qa)}var na="closure_uid_"+(1E9*Math.random()>>>0),qa=0;function ra(a,b,c){return a.call.apply(a.bind,arguments)}
function sa(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function ta(a,b,c){ta=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ra:sa;return ta.apply(null,arguments)}var va=Date.now||function(){return+new Date};
function wa(a,b){function c(){}c.prototype=b.prototype;a.$b=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Mb=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}};function xa(a){if(Error.captureStackTrace)Error.captureStackTrace(this,xa);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}wa(xa,Error);xa.prototype.name="CustomError";function ya(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")}var Aa=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function Ba(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")}function Ca(a,b){return a<b?-1:a>b?1:0}
function Da(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})}function Fa(a){var b=ia(void 0)?Ba(void 0):"\\s";return a.replace(new RegExp("(^"+(b?"|["+b+"]+":"")+")([a-z])","g"),function(a,b,e){return b+e.toUpperCase()})};function Ga(a,b){b.unshift(a);xa.call(this,ya.apply(null,b));b.shift()}wa(Ga,xa);Ga.prototype.name="AssertionError";function Ha(a,b){throw new Ga("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};var Ja=Array.prototype,Ka=Ja.indexOf?function(a,b,c){return Ja.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(ia(a))return ia(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},La=Ja.forEach?function(a,b,c){Ja.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=ia(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)};
function Na(a){var b;a:{b=Oa;for(var c=a.length,d=ia(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:ia(a)?a.charAt(b):a[b]}function Pa(a,b){var c=Ka(a,b),d;(d=0<=c)&&Ja.splice.call(a,c,1);return d}function Qa(a,b){return a>b?1:a<b?-1:0};var Ra;a:{var Sa=ca.navigator;if(Sa){var Ta=Sa.userAgent;if(Ta){Ra=Ta;break a}}Ra=""};function Ua(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function Va(a,b){for(var c in a)if(b.call(void 0,a[c],c,a))return!0;return!1}function Wa(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function Xa(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}var Za="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function $a(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<Za.length;f++)c=Za[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}}function ab(a){var b=arguments.length;if(1==b&&"array"==t(arguments[0]))return ab.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};var bb=-1!=Ra.indexOf("Opera")||-1!=Ra.indexOf("OPR"),cb=-1!=Ra.indexOf("Trident")||-1!=Ra.indexOf("MSIE"),db=-1!=Ra.indexOf("Edge"),eb=-1!=Ra.indexOf("Gecko")&&!(-1!=Ra.toLowerCase().indexOf("webkit")&&-1==Ra.indexOf("Edge"))&&!(-1!=Ra.indexOf("Trident")||-1!=Ra.indexOf("MSIE"))&&-1==Ra.indexOf("Edge"),fb=-1!=Ra.toLowerCase().indexOf("webkit")&&-1==Ra.indexOf("Edge");
function gb(){var a=Ra;if(eb)return/rv\:([^\);]+)(\)|;)/.exec(a);if(db)return/Edge\/([\d\.]+)/.exec(a);if(cb)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(fb)return/WebKit\/(\S+)/.exec(a)}function hb(){var a=ca.document;return a?a.documentMode:void 0}var ib=function(){if(bb&&ca.opera){var a=ca.opera.version;return ka(a)?a():a}var a="",b=gb();b&&(a=b?b[1]:"");return cb&&(b=hb(),b>parseFloat(a))?String(b):a}(),jb={};
function kb(a){var b;if(!(b=jb[a])){b=0;for(var c=Aa(String(ib)).split("."),d=Aa(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var g=c[f]||"",k=d[f]||"",l=RegExp("(\\d*)(\\D*)","g"),m=RegExp("(\\d*)(\\D*)","g");do{var n=l.exec(g)||["","",""],p=m.exec(k)||["","",""];if(0==n[0].length&&0==p[0].length)break;b=Ca(0==n[1].length?0:parseInt(n[1],10),0==p[1].length?0:parseInt(p[1],10))||Ca(0==n[2].length,0==p[2].length)||Ca(n[2],p[2])}while(0==b)}b=jb[a]=0<=b}return b}
var lb=ca.document,mb=lb&&cb?hb()||("CSS1Compat"==lb.compatMode?parseInt(ib,10):5):void 0;!eb&&!cb||cb&&9<=mb||eb&&kb("1.9.1");cb&&kb("9");ab("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));function ob(a,b){null!=a&&this.append.apply(this,arguments)}h=ob.prototype;h.Ra="";h.set=function(a){this.Ra=""+a};h.append=function(a,b,c){this.Ra+=a;if(null!=b)for(var d=1;d<arguments.length;d++)this.Ra+=arguments[d];return this};h.clear=function(){this.Ra=""};h.getLength=function(){return this.Ra.length};h.toString=function(){return this.Ra};var pb={},qb;if("undefined"===typeof rb)var rb=function(){throw Error("No *print-fn* fn set for evaluation environment");};if("undefined"===typeof sb)var sb=function(){throw Error("No *print-err-fn* fn set for evaluation environment");};var tb=null;if("undefined"===typeof ub)var ub=null;function vb(){return new u(null,5,[wb,!0,xb,!0,yb,!1,zb,!1,Ab,null],null)}Bb;function y(a){return null!=a&&!1!==a}Cb;B;function Db(a){return a instanceof Array}function Fb(a){return null==a?!0:!1===a?!0:!1}
function C(a,b){return a[t(null==b?null:b)]?!0:a._?!0:!1}function D(a,b){var c=null==b?null:b.constructor,c=y(y(c)?c.yc:c)?c.Sb:t(b);return Error(["No protocol method ",a," defined for type ",c,": ",b].join(""))}function Gb(a){var b=a.Sb;return y(b)?b:""+E(a)}var Hb="undefined"!==typeof Symbol&&"function"===t(Symbol)?Symbol.iterator:"@@iterator";function Ib(a){for(var b=a.length,c=Array(b),d=0;;)if(d<b)c[d]=a[d],d+=1;else break;return c}Jb;Kb;
var Bb=function Bb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Bb.a(arguments[0]);case 2:return Bb.b(arguments[0],arguments[1]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};Bb.a=function(a){return Bb.b(null,a)};Bb.b=function(a,b){function c(a,b){a.push(b);return a}var d=[];return Kb.c?Kb.c(c,d,b):Kb.call(null,c,d,b)};Bb.A=2;function Lb(){}
var Mb=function Mb(b){if(null!=b&&null!=b.X)return b.X(b);var c=Mb[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Mb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ICounted.-count",b);};function Nb(){}var Ob=function Ob(b,c){if(null!=b&&null!=b.U)return b.U(b,c);var d=Ob[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Ob._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ICollection.-conj",b);};function Pb(){}
var F=function F(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return F.b(arguments[0],arguments[1]);case 3:return F.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
F.b=function(a,b){if(null!=a&&null!=a.O)return a.O(a,b);var c=F[t(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=F._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IIndexed.-nth",a);};F.c=function(a,b,c){if(null!=a&&null!=a.wa)return a.wa(a,b,c);var d=F[t(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=F._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IIndexed.-nth",a);};F.A=3;function Qb(){}
var Rb=function Rb(b){if(null!=b&&null!=b.aa)return b.aa(b);var c=Rb[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Rb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-first",b);},Sb=function Sb(b){if(null!=b&&null!=b.sa)return b.sa(b);var c=Sb[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Sb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-rest",b);};function Tb(){}function Ub(){}
var Vb=function Vb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Vb.b(arguments[0],arguments[1]);case 3:return Vb.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
Vb.b=function(a,b){if(null!=a&&null!=a.K)return a.K(a,b);var c=Vb[t(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Vb._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ILookup.-lookup",a);};Vb.c=function(a,b,c){if(null!=a&&null!=a.H)return a.H(a,b,c);var d=Vb[t(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Vb._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ILookup.-lookup",a);};Vb.A=3;
var Wb=function Wb(b,c){if(null!=b&&null!=b.hc)return b.hc(b,c);var d=Wb[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Wb._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IAssociative.-contains-key?",b);},Xb=function Xb(b,c,d){if(null!=b&&null!=b.Va)return b.Va(b,c,d);var e=Xb[t(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Xb._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IAssociative.-assoc",b);};function Yb(){}
function Zb(){}var ac=function ac(b){if(null!=b&&null!=b.tb)return b.tb(b);var c=ac[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=ac._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-key",b);},bc=function bc(b){if(null!=b&&null!=b.ub)return b.ub(b);var c=bc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=bc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-val",b);};function cc(){}
var dc=function dc(b){if(null!=b&&null!=b.Wa)return b.Wa(b);var c=dc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=dc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-peek",b);},ec=function ec(b){if(null!=b&&null!=b.Xa)return b.Xa(b);var c=ec[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=ec._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-pop",b);};function fc(){}
var gc=function gc(b,c,d){if(null!=b&&null!=b.Ya)return b.Ya(b,c,d);var e=gc[t(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=gc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IVector.-assoc-n",b);},hc=function hc(b){if(null!=b&&null!=b.Pb)return b.Pb(b);var c=hc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IDeref.-deref",b);};function ic(){}
var jc=function jc(b){if(null!=b&&null!=b.R)return b.R(b);var c=jc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=jc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMeta.-meta",b);},kc=function kc(b,c){if(null!=b&&null!=b.T)return b.T(b,c);var d=kc[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=kc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWithMeta.-with-meta",b);};function lc(){}
var mc=function mc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return mc.b(arguments[0],arguments[1]);case 3:return mc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
mc.b=function(a,b){if(null!=a&&null!=a.Z)return a.Z(a,b);var c=mc[t(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=mc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IReduce.-reduce",a);};mc.c=function(a,b,c){if(null!=a&&null!=a.$)return a.$(a,b,c);var d=mc[t(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=mc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IReduce.-reduce",a);};mc.A=3;
var nc=function nc(b,c){if(null!=b&&null!=b.v)return b.v(b,c);var d=nc[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=nc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IEquiv.-equiv",b);},pc=function pc(b){if(null!=b&&null!=b.N)return b.N(b);var c=pc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=pc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IHash.-hash",b);};function qc(){}
var rc=function rc(b){if(null!=b&&null!=b.S)return b.S(b);var c=rc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=rc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeqable.-seq",b);};function sc(){}function tc(){}function uc(){}
var vc=function vc(b){if(null!=b&&null!=b.Rb)return b.Rb(b);var c=vc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=vc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IReversible.-rseq",b);},wc=function wc(b,c){if(null!=b&&null!=b.xc)return b.xc(0,c);var d=wc[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=wc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWriter.-write",b);},xc=function xc(b,c,d){if(null!=b&&null!=b.L)return b.L(b,c,d);var e=
xc[t(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=xc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IPrintWithWriter.-pr-writer",b);},yc=function yc(b,c,d){if(null!=b&&null!=b.wc)return b.wc(0,c,d);var e=yc[t(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=yc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IWatchable.-notify-watches",b);},zc=function zc(b){if(null!=b&&null!=b.gb)return b.gb(b);var c=zc[t(null==b?null:
b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=zc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEditableCollection.-as-transient",b);},Ac=function Ac(b,c){if(null!=b&&null!=b.yb)return b.yb(b,c);var d=Ac[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Ac._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ITransientCollection.-conj!",b);},Bc=function Bc(b){if(null!=b&&null!=b.zb)return b.zb(b);var c=Bc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Bc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ITransientCollection.-persistent!",b);},Cc=function Cc(b,c,d){if(null!=b&&null!=b.xb)return b.xb(b,c,d);var e=Cc[t(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Cc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientAssociative.-assoc!",b);},Dc=function Dc(b,c,d){if(null!=b&&null!=b.vc)return b.vc(0,c,d);var e=Dc[t(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Dc._;
if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientVector.-assoc-n!",b);};function Ec(){}
var Fc=function Fc(b,c){if(null!=b&&null!=b.fb)return b.fb(b,c);var d=Fc[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Fc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IComparable.-compare",b);},Hc=function Hc(b){if(null!=b&&null!=b.sc)return b.sc();var c=Hc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunk.-drop-first",b);},Ic=function Ic(b){if(null!=b&&null!=b.jc)return b.jc(b);var c=
Ic[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Ic._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-first",b);},Jc=function Jc(b){if(null!=b&&null!=b.kc)return b.kc(b);var c=Jc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Jc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-rest",b);},Kc=function Kc(b){if(null!=b&&null!=b.ic)return b.ic(b);var c=Kc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Kc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedNext.-chunked-next",b);},Lc=function Lc(b){if(null!=b&&null!=b.vb)return b.vb(b);var c=Lc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Lc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-name",b);},Mc=function Mc(b){if(null!=b&&null!=b.wb)return b.wb(b);var c=Mc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Mc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-namespace",
b);},Nc=function Nc(b,c){if(null!=b&&null!=b.Wc)return b.Wc(b,c);var d=Nc[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Nc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IReset.-reset!",b);},Oc=function Oc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Oc.b(arguments[0],arguments[1]);case 3:return Oc.c(arguments[0],arguments[1],arguments[2]);case 4:return Oc.m(arguments[0],arguments[1],arguments[2],
arguments[3]);case 5:return Oc.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};Oc.b=function(a,b){if(null!=a&&null!=a.Yc)return a.Yc(a,b);var c=Oc[t(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Oc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ISwap.-swap!",a);};
Oc.c=function(a,b,c){if(null!=a&&null!=a.Zc)return a.Zc(a,b,c);var d=Oc[t(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Oc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ISwap.-swap!",a);};Oc.m=function(a,b,c,d){if(null!=a&&null!=a.$c)return a.$c(a,b,c,d);var e=Oc[t(null==a?null:a)];if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);e=Oc._;if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);throw D("ISwap.-swap!",a);};
Oc.C=function(a,b,c,d,e){if(null!=a&&null!=a.ad)return a.ad(a,b,c,d,e);var f=Oc[t(null==a?null:a)];if(null!=f)return f.C?f.C(a,b,c,d,e):f.call(null,a,b,c,d,e);f=Oc._;if(null!=f)return f.C?f.C(a,b,c,d,e):f.call(null,a,b,c,d,e);throw D("ISwap.-swap!",a);};Oc.A=5;var Pc=function Pc(b){if(null!=b&&null!=b.Ma)return b.Ma(b);var c=Pc[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Pc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IIterable.-iterator",b);};
function Qc(a){this.od=a;this.i=1073741824;this.B=0}Qc.prototype.xc=function(a,b){return this.od.append(b)};function Rc(a){var b=new ob;a.L(null,new Qc(b),vb());return""+E(b)}var Sc="undefined"!==typeof Math.imul&&0!==Math.imul(4294967295,5)?function(a,b){return Math.imul(a,b)}:function(a,b){var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};function Tc(a){a=Sc(a|0,-862048943);return Sc(a<<15|a>>>-15,461845907)}
function Uc(a,b){var c=(a|0)^(b|0);return Sc(c<<13|c>>>-13,5)+-430675100|0}function Vc(a,b){var c=(a|0)^b,c=Sc(c^c>>>16,-2048144789),c=Sc(c^c>>>13,-1028477387);return c^c>>>16}function Wc(a){var b;a:{b=1;for(var c=0;;)if(b<a.length){var d=b+2,c=Uc(c,Tc(a.charCodeAt(b-1)|a.charCodeAt(b)<<16));b=d}else{b=c;break a}}b=1===(a.length&1)?b^Tc(a.charCodeAt(a.length-1)):b;return Vc(b,Sc(2,a.length))}Xc;Yc;Zc;$c;var ad={},bd=0;
function cd(a){255<bd&&(ad={},bd=0);var b=ad[a];if("number"!==typeof b){a:if(null!=a)if(b=a.length,0<b)for(var c=0,d=0;;)if(c<b)var e=c+1,d=Sc(31,d)+a.charCodeAt(c),c=e;else{b=d;break a}else b=0;else b=0;ad[a]=b;bd+=1}return a=b}function dd(a){null!=a&&(a.i&4194304||a.td)?a=a.N(null):"number"===typeof a?a=Math.floor(a)%2147483647:!0===a?a=1:!1===a?a=0:"string"===typeof a?(a=cd(a),0!==a&&(a=Tc(a),a=Uc(0,a),a=Vc(a,4))):a=a instanceof Date?a.valueOf():null==a?0:pc(a);return a}
function ed(a,b){return a^b+2654435769+(a<<6)+(a>>2)}function Cb(a,b){return b instanceof a}function fd(a,b){if(a.La===b.La)return 0;var c=Fb(a.qa);if(y(c?b.qa:c))return-1;if(y(a.qa)){if(Fb(b.qa))return 1;c=Qa(a.qa,b.qa);return 0===c?Qa(a.name,b.name):c}return Qa(a.name,b.name)}gd;function Yc(a,b,c,d,e){this.qa=a;this.name=b;this.La=c;this.eb=d;this.Ba=e;this.i=2154168321;this.B=4096}h=Yc.prototype;h.toString=function(){return this.La};h.equiv=function(a){return this.v(null,a)};
h.v=function(a,b){return b instanceof Yc?this.La===b.La:!1};h.call=function(){function a(a,b,c){return gd.c?gd.c(b,this,c):gd.call(null,b,this,c)}function b(a,b){return gd.b?gd.b(b,this):gd.call(null,b,this)}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,0,e);case 3:return a.call(this,0,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};
h.a=function(a){return gd.b?gd.b(a,this):gd.call(null,a,this)};h.b=function(a,b){return gd.c?gd.c(a,this,b):gd.call(null,a,this,b)};h.R=function(){return this.Ba};h.T=function(a,b){return new Yc(this.qa,this.name,this.La,this.eb,b)};h.N=function(){var a=this.eb;return null!=a?a:this.eb=a=ed(Wc(this.name),cd(this.qa))};h.vb=function(){return this.name};h.wb=function(){return this.qa};h.L=function(a,b){return wc(b,this.La)};
var hd=function hd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return hd.a(arguments[0]);case 2:return hd.b(arguments[0],arguments[1]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};hd.a=function(a){if(a instanceof Yc)return a;var b=a.indexOf("/");return-1===b?hd.b(null,a):hd.b(a.substring(0,b),a.substring(b+1,a.length))};hd.b=function(a,b){var c=null!=a?[E(a),E("/"),E(b)].join(""):b;return new Yc(a,b,c,null,null)};
hd.A=2;H;id;jd;function I(a){if(null==a)return null;if(null!=a&&(a.i&8388608||a.Xc))return a.S(null);if(Db(a)||"string"===typeof a)return 0===a.length?null:new jd(a,0);if(C(qc,a))return rc(a);throw Error([E(a),E(" is not ISeqable")].join(""));}function J(a){if(null==a)return null;if(null!=a&&(a.i&64||a.hb))return a.aa(null);a=I(a);return null==a?null:Rb(a)}function kd(a){return null!=a?null!=a&&(a.i&64||a.hb)?a.sa(null):(a=I(a))?Sb(a):ld:ld}
function L(a){return null==a?null:null!=a&&(a.i&128||a.Qb)?a.ra(null):I(kd(a))}var Zc=function Zc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Zc.a(arguments[0]);case 2:return Zc.b(arguments[0],arguments[1]);default:return Zc.o(arguments[0],arguments[1],new jd(c.slice(2),0))}};Zc.a=function(){return!0};Zc.b=function(a,b){return null==a?null==b:a===b||nc(a,b)};
Zc.o=function(a,b,c){for(;;)if(Zc.b(a,b))if(L(c))a=b,b=J(c),c=L(c);else return Zc.b(b,J(c));else return!1};Zc.G=function(a){var b=J(a),c=L(a);a=J(c);c=L(c);return Zc.o(b,a,c)};Zc.A=2;function md(a){this.D=a}md.prototype.next=function(){if(null!=this.D){var a=J(this.D);this.D=L(this.D);return{value:a,done:!1}}return{value:null,done:!0}};function nd(a){return new md(I(a))}od;function pd(a,b,c){this.value=a;this.kb=b;this.ec=c;this.i=8388672;this.B=0}pd.prototype.S=function(){return this};
pd.prototype.aa=function(){return this.value};pd.prototype.sa=function(){null==this.ec&&(this.ec=od.a?od.a(this.kb):od.call(null,this.kb));return this.ec};function od(a){var b=a.next();return y(b.done)?ld:new pd(b.value,a,null)}function qd(a,b){var c=Tc(a),c=Uc(0,c);return Vc(c,b)}function rd(a){var b=0,c=1;for(a=I(a);;)if(null!=a)b+=1,c=Sc(31,c)+dd(J(a))|0,a=L(a);else return qd(c,b)}var sd=qd(1,0);function td(a){var b=0,c=0;for(a=I(a);;)if(null!=a)b+=1,c=c+dd(J(a))|0,a=L(a);else return qd(c,b)}
var ud=qd(0,0);vd;Xc;wd;Lb["null"]=!0;Mb["null"]=function(){return 0};Date.prototype.v=function(a,b){return b instanceof Date&&this.valueOf()===b.valueOf()};Date.prototype.rb=!0;Date.prototype.fb=function(a,b){if(b instanceof Date)return Qa(this.valueOf(),b.valueOf());throw Error([E("Cannot compare "),E(this),E(" to "),E(b)].join(""));};nc.number=function(a,b){return a===b};yd;ic["function"]=!0;jc["function"]=function(){return null};pc._=function(a){return la(a)};M;
function zd(a){this.J=a;this.i=32768;this.B=0}zd.prototype.Pb=function(){return this.J};function Ad(a){return a instanceof zd}function M(a){return hc(a)}function Bd(a,b){var c=Mb(a);if(0===c)return b.w?b.w():b.call(null);for(var d=F.b(a,0),e=1;;)if(e<c){var f=F.b(a,e),d=b.b?b.b(d,f):b.call(null,d,f);if(Ad(d))return hc(d);e+=1}else return d}function Cd(a,b,c){var d=Mb(a),e=c;for(c=0;;)if(c<d){var f=F.b(a,c),e=b.b?b.b(e,f):b.call(null,e,f);if(Ad(e))return hc(e);c+=1}else return e}
function Dd(a,b){var c=a.length;if(0===a.length)return b.w?b.w():b.call(null);for(var d=a[0],e=1;;)if(e<c){var f=a[e],d=b.b?b.b(d,f):b.call(null,d,f);if(Ad(d))return hc(d);e+=1}else return d}function Ed(a,b,c){var d=a.length,e=c;for(c=0;;)if(c<d){var f=a[c],e=b.b?b.b(e,f):b.call(null,e,f);if(Ad(e))return hc(e);c+=1}else return e}function Fd(a,b,c,d){for(var e=a.length;;)if(d<e){var f=a[d];c=b.b?b.b(c,f):b.call(null,c,f);if(Ad(c))return hc(c);d+=1}else return c}Gd;N;Hd;Id;
function Jd(a){return null!=a?a.i&2||a.Nc?!0:a.i?!1:C(Lb,a):C(Lb,a)}function Kd(a){return null!=a?a.i&16||a.tc?!0:a.i?!1:C(Pb,a):C(Pb,a)}function Ld(a,b){this.f=a;this.l=b}Ld.prototype.xa=function(){return this.l<this.f.length};Ld.prototype.next=function(){var a=this.f[this.l];this.l+=1;return a};function jd(a,b){this.f=a;this.l=b;this.i=166199550;this.B=8192}h=jd.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};
h.O=function(a,b){var c=b+this.l;return c<this.f.length?this.f[c]:null};h.wa=function(a,b,c){a=b+this.l;return a<this.f.length?this.f[a]:c};h.Ma=function(){return new Ld(this.f,this.l)};h.ra=function(){return this.l+1<this.f.length?new jd(this.f,this.l+1):null};h.X=function(){var a=this.f.length-this.l;return 0>a?0:a};h.Rb=function(){var a=Mb(this);return 0<a?new Hd(this,a-1,null):null};h.N=function(){return rd(this)};h.v=function(a,b){return wd.b?wd.b(this,b):wd.call(null,this,b)};
h.Z=function(a,b){return Fd(this.f,b,this.f[this.l],this.l+1)};h.$=function(a,b,c){return Fd(this.f,b,c,this.l)};h.aa=function(){return this.f[this.l]};h.sa=function(){return this.l+1<this.f.length?new jd(this.f,this.l+1):ld};h.S=function(){return this.l<this.f.length?this:null};h.U=function(a,b){return N.b?N.b(b,this):N.call(null,b,this)};jd.prototype[Hb]=function(){return nd(this)};
var id=function id(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return id.a(arguments[0]);case 2:return id.b(arguments[0],arguments[1]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};id.a=function(a){return id.b(a,0)};id.b=function(a,b){return b<a.length?new jd(a,b):null};id.A=2;
var H=function H(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return H.a(arguments[0]);case 2:return H.b(arguments[0],arguments[1]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};H.a=function(a){return id.b(a,0)};H.b=function(a,b){return id.b(a,b)};H.A=2;yd;Md;function Hd(a,b,c){this.Ob=a;this.l=b;this.u=c;this.i=32374990;this.B=8192}h=Hd.prototype;h.toString=function(){return Rc(this)};
h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return 0<this.l?new Hd(this.Ob,this.l-1,null):null};h.X=function(){return this.l+1};h.N=function(){return rd(this)};h.v=function(a,b){return wd.b?wd.b(this,b):wd.call(null,this,b)};h.Z=function(a,b){return Md.b?Md.b(b,this):Md.call(null,b,this)};h.$=function(a,b,c){return Md.c?Md.c(b,c,this):Md.call(null,b,c,this)};h.aa=function(){return F.b(this.Ob,this.l)};
h.sa=function(){return 0<this.l?new Hd(this.Ob,this.l-1,null):ld};h.S=function(){return this};h.T=function(a,b){return new Hd(this.Ob,this.l,b)};h.U=function(a,b){return N.b?N.b(b,this):N.call(null,b,this)};Hd.prototype[Hb]=function(){return nd(this)};function Nd(a){return J(L(a))}nc._=function(a,b){return a===b};
var Od=function Od(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Od.w();case 1:return Od.a(arguments[0]);case 2:return Od.b(arguments[0],arguments[1]);default:return Od.o(arguments[0],arguments[1],new jd(c.slice(2),0))}};Od.w=function(){return Pd};Od.a=function(a){return a};Od.b=function(a,b){return null!=a?Ob(a,b):Ob(ld,b)};Od.o=function(a,b,c){for(;;)if(y(c))a=Od.b(a,b),b=J(c),c=L(c);else return Od.b(a,b)};
Od.G=function(a){var b=J(a),c=L(a);a=J(c);c=L(c);return Od.o(b,a,c)};Od.A=2;function O(a){if(null!=a)if(null!=a&&(a.i&2||a.Nc))a=a.X(null);else if(Db(a))a=a.length;else if("string"===typeof a)a=a.length;else if(null!=a&&(a.i&8388608||a.Xc))a:{a=I(a);for(var b=0;;){if(Jd(a)){a=b+Mb(a);break a}a=L(a);b+=1}}else a=Mb(a);else a=0;return a}function Qd(a,b){for(var c=null;;){if(null==a)return c;if(0===b)return I(a)?J(a):c;if(Kd(a))return F.c(a,b,c);if(I(a)){var d=L(a),e=b-1;a=d;b=e}else return c}}
function Rd(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number");if(null==a)return a;if(null!=a&&(a.i&16||a.tc))return a.O(null,b);if(Db(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.hb)){var c;a:{c=a;for(var d=b;;){if(null==c)throw Error("Index out of bounds");if(0===d){if(I(c)){c=J(c);break a}throw Error("Index out of bounds");}if(Kd(c)){c=F.b(c,d);break a}if(I(c))c=L(c),--d;else throw Error("Index out of bounds");
}}return c}if(C(Pb,a))return F.b(a,b);throw Error([E("nth not supported on this type "),E(Gb(null==a?null:a.constructor))].join(""));}
function P(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number.");if(null==a)return null;if(null!=a&&(a.i&16||a.tc))return a.wa(null,b,null);if(Db(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.hb))return Qd(a,b);if(C(Pb,a))return F.b(a,b);throw Error([E("nth not supported on this type "),E(Gb(null==a?null:a.constructor))].join(""));}
var gd=function gd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return gd.b(arguments[0],arguments[1]);case 3:return gd.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};gd.b=function(a,b){return null==a?null:null!=a&&(a.i&256||a.uc)?a.K(null,b):Db(a)?b<a.length?a[b|0]:null:"string"===typeof a?b<a.length?a[b|0]:null:C(Ub,a)?Vb.b(a,b):null};
gd.c=function(a,b,c){return null!=a?null!=a&&(a.i&256||a.uc)?a.H(null,b,c):Db(a)?b<a.length?a[b]:c:"string"===typeof a?b<a.length?a[b]:c:C(Ub,a)?Vb.c(a,b,c):c:c};gd.A=3;Sd;var Td=function Td(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Td.c(arguments[0],arguments[1],arguments[2]);default:return Td.o(arguments[0],arguments[1],arguments[2],new jd(c.slice(3),0))}};
Td.c=function(a,b,c){if(null!=a)a=Xb(a,b,c);else a:{a=[b];c=[c];b=a.length;var d=0,e;for(e=zc(Ud);;)if(d<b){var f=d+1;e=e.xb(null,a[d],c[d]);d=f}else{a=Bc(e);break a}}return a};Td.o=function(a,b,c,d){for(;;)if(a=Td.c(a,b,c),y(d))b=J(d),c=Nd(d),d=L(L(d));else return a};Td.G=function(a){var b=J(a),c=L(a);a=J(c);var d=L(c),c=J(d),d=L(d);return Td.o(b,a,c,d)};Td.A=3;function Vd(a,b){this.g=a;this.u=b;this.i=393217;this.B=0}h=Vd.prototype;h.R=function(){return this.u};
h.T=function(a,b){return new Vd(this.g,b)};
h.call=function(){function a(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K,T){a=this;return Jb.sb?Jb.sb(a.g,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K,T):Jb.call(null,a.g,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K,T)}function b(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K){a=this;return a.g.ma?a.g.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K)}function c(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G){a=this;return a.g.la?a.g.la(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,
G):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G)}function d(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z){a=this;return a.g.ka?a.g.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z)}function e(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A){a=this;return a.g.ja?a.g.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A)}function f(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x){a=this;return a.g.ia?a.g.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):a.g.call(null,
b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x)}function g(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w){a=this;return a.g.ha?a.g.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w)}function k(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v){a=this;return a.g.ga?a.g.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,v):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v)}function l(a,b,c,d,e,f,g,k,l,m,n,p,q,r){a=this;return a.g.fa?a.g.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r)}function m(a,b,c,d,e,f,g,k,l,m,n,p,q){a=this;
return a.g.ea?a.g.ea(b,c,d,e,f,g,k,l,m,n,p,q):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q)}function n(a,b,c,d,e,f,g,k,l,m,n,p){a=this;return a.g.da?a.g.da(b,c,d,e,f,g,k,l,m,n,p):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p)}function p(a,b,c,d,e,f,g,k,l,m,n){a=this;return a.g.ca?a.g.ca(b,c,d,e,f,g,k,l,m,n):a.g.call(null,b,c,d,e,f,g,k,l,m,n)}function q(a,b,c,d,e,f,g,k,l,m){a=this;return a.g.oa?a.g.oa(b,c,d,e,f,g,k,l,m):a.g.call(null,b,c,d,e,f,g,k,l,m)}function r(a,b,c,d,e,f,g,k,l){a=this;return a.g.na?a.g.na(b,c,
d,e,f,g,k,l):a.g.call(null,b,c,d,e,f,g,k,l)}function v(a,b,c,d,e,f,g,k){a=this;return a.g.W?a.g.W(b,c,d,e,f,g,k):a.g.call(null,b,c,d,e,f,g,k)}function w(a,b,c,d,e,f,g){a=this;return a.g.V?a.g.V(b,c,d,e,f,g):a.g.call(null,b,c,d,e,f,g)}function x(a,b,c,d,e,f){a=this;return a.g.C?a.g.C(b,c,d,e,f):a.g.call(null,b,c,d,e,f)}function A(a,b,c,d,e){a=this;return a.g.m?a.g.m(b,c,d,e):a.g.call(null,b,c,d,e)}function G(a,b,c,d){a=this;return a.g.c?a.g.c(b,c,d):a.g.call(null,b,c,d)}function K(a,b,c){a=this;return a.g.b?
a.g.b(b,c):a.g.call(null,b,c)}function T(a,b){a=this;return a.g.a?a.g.a(b):a.g.call(null,b)}function pa(a){a=this;return a.g.w?a.g.w():a.g.call(null)}var z=null,z=function(Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya,nb,Eb,$b,Gc,xd,tf){switch(arguments.length){case 1:return pa.call(this,Ea);case 2:return T.call(this,Ea,S);case 3:return K.call(this,Ea,S,U);case 4:return G.call(this,Ea,S,U,W);case 5:return A.call(this,Ea,S,U,W,aa);case 6:return x.call(this,Ea,S,U,W,aa,da);case 7:return w.call(this,Ea,
S,U,W,aa,da,ga);case 8:return v.call(this,Ea,S,U,W,aa,da,ga,ja);case 9:return r.call(this,Ea,S,U,W,aa,da,ga,ja,ma);case 10:return q.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa);case 11:return p.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua);case 12:return n.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za);case 13:return m.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia);case 14:return l.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma);case 15:return k.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z);case 16:return g.call(this,
Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya);case 17:return f.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya,nb);case 18:return e.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya,nb,Eb);case 19:return d.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya,nb,Eb,$b);case 20:return c.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya,nb,Eb,$b,Gc);case 21:return b.call(this,Ea,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,z,Ya,nb,Eb,$b,Gc,xd);case 22:return a.call(this,Ea,S,U,W,aa,da,ga,ja,ma,
oa,ua,za,Ia,Ma,z,Ya,nb,Eb,$b,Gc,xd,tf)}throw Error("Invalid arity: "+arguments.length);};z.a=pa;z.b=T;z.c=K;z.m=G;z.C=A;z.V=x;z.W=w;z.na=v;z.oa=r;z.ca=q;z.da=p;z.ea=n;z.fa=m;z.ga=l;z.ha=k;z.ia=g;z.ja=f;z.ka=e;z.la=d;z.ma=c;z.lc=b;z.sb=a;return z}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.w=function(){return this.g.w?this.g.w():this.g.call(null)};h.a=function(a){return this.g.a?this.g.a(a):this.g.call(null,a)};
h.b=function(a,b){return this.g.b?this.g.b(a,b):this.g.call(null,a,b)};h.c=function(a,b,c){return this.g.c?this.g.c(a,b,c):this.g.call(null,a,b,c)};h.m=function(a,b,c,d){return this.g.m?this.g.m(a,b,c,d):this.g.call(null,a,b,c,d)};h.C=function(a,b,c,d,e){return this.g.C?this.g.C(a,b,c,d,e):this.g.call(null,a,b,c,d,e)};h.V=function(a,b,c,d,e,f){return this.g.V?this.g.V(a,b,c,d,e,f):this.g.call(null,a,b,c,d,e,f)};
h.W=function(a,b,c,d,e,f,g){return this.g.W?this.g.W(a,b,c,d,e,f,g):this.g.call(null,a,b,c,d,e,f,g)};h.na=function(a,b,c,d,e,f,g,k){return this.g.na?this.g.na(a,b,c,d,e,f,g,k):this.g.call(null,a,b,c,d,e,f,g,k)};h.oa=function(a,b,c,d,e,f,g,k,l){return this.g.oa?this.g.oa(a,b,c,d,e,f,g,k,l):this.g.call(null,a,b,c,d,e,f,g,k,l)};h.ca=function(a,b,c,d,e,f,g,k,l,m){return this.g.ca?this.g.ca(a,b,c,d,e,f,g,k,l,m):this.g.call(null,a,b,c,d,e,f,g,k,l,m)};
h.da=function(a,b,c,d,e,f,g,k,l,m,n){return this.g.da?this.g.da(a,b,c,d,e,f,g,k,l,m,n):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n)};h.ea=function(a,b,c,d,e,f,g,k,l,m,n,p){return this.g.ea?this.g.ea(a,b,c,d,e,f,g,k,l,m,n,p):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p)};h.fa=function(a,b,c,d,e,f,g,k,l,m,n,p,q){return this.g.fa?this.g.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q)};
h.ga=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r){return this.g.ga?this.g.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r)};h.ha=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v){return this.g.ha?this.g.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v)};h.ia=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w){return this.g.ia?this.g.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w)};
h.ja=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x){return this.g.ja?this.g.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x)};h.ka=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A){return this.g.ka?this.g.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A)};
h.la=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G){return this.g.la?this.g.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G)};h.ma=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K){return this.g.ma?this.g.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K)};
h.lc=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T){return Jb.sb?Jb.sb(this.g,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T):Jb.call(null,this.g,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T)};function yd(a,b){return ka(a)?new Vd(a,b):null==a?null:kc(a,b)}function Wd(a){var b=null!=a;return(b?null!=a?a.i&131072||a.Tc||(a.i?0:C(ic,a)):C(ic,a):b)?jc(a):null}function Xd(a){return null==a?!1:null!=a?a.i&4096||a.xd?!0:a.i?!1:C(cc,a):C(cc,a)}
function Yd(a){return null!=a?a.i&16777216||a.wd?!0:a.i?!1:C(sc,a):C(sc,a)}function Zd(a){return null==a?!1:null!=a?a.i&1024||a.Rc?!0:a.i?!1:C(Yb,a):C(Yb,a)}function $d(a){return null!=a?a.i&16384||a.yd?!0:a.i?!1:C(fc,a):C(fc,a)}ae;be;function ce(a){return null!=a?a.B&512||a.rd?!0:!1:!1}function de(a){var b=[];Ua(a,function(a,b){return function(a,c){return b.push(c)}}(a,b));return b}function ee(a,b,c,d,e){for(;0!==e;)c[d]=a[b],d+=1,--e,b+=1}var fe={};
function ge(a){return null==a?!1:null!=a?a.i&64||a.hb?!0:a.i?!1:C(Qb,a):C(Qb,a)}function he(a){return null==a?!1:!1===a?!1:!0}function ie(a,b){return gd.c(a,b,fe)===fe?!1:!0}
function $c(a,b){if(a===b)return 0;if(null==a)return-1;if(null==b)return 1;if("number"===typeof a){if("number"===typeof b)return Qa(a,b);throw Error([E("Cannot compare "),E(a),E(" to "),E(b)].join(""));}if(null!=a?a.B&2048||a.rb||(a.B?0:C(Ec,a)):C(Ec,a))return Fc(a,b);if("string"!==typeof a&&!Db(a)&&!0!==a&&!1!==a||(null==a?null:a.constructor)!==(null==b?null:b.constructor))throw Error([E("Cannot compare "),E(a),E(" to "),E(b)].join(""));return Qa(a,b)}
function je(a,b){var c=O(a),d=O(b);if(c<d)c=-1;else if(c>d)c=1;else if(0===c)c=0;else a:for(d=0;;){var e=$c(Rd(a,d),Rd(b,d));if(0===e&&d+1<c)d+=1;else{c=e;break a}}return c}ke;var Md=function Md(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Md.b(arguments[0],arguments[1]);case 3:return Md.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
Md.b=function(a,b){var c=I(b);if(c){var d=J(c),c=L(c);return Kb.c?Kb.c(a,d,c):Kb.call(null,a,d,c)}return a.w?a.w():a.call(null)};Md.c=function(a,b,c){for(c=I(c);;)if(c){var d=J(c);b=a.b?a.b(b,d):a.call(null,b,d);if(Ad(b))return hc(b);c=L(c)}else return b};Md.A=3;le;
var Kb=function Kb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Kb.b(arguments[0],arguments[1]);case 3:return Kb.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};Kb.b=function(a,b){return null!=b&&(b.i&524288||b.Vc)?b.Z(null,a):Db(b)?Dd(b,a):"string"===typeof b?Dd(b,a):C(lc,b)?mc.b(b,a):Md.b(a,b)};
Kb.c=function(a,b,c){return null!=c&&(c.i&524288||c.Vc)?c.$(null,a,b):Db(c)?Ed(c,a,b):"string"===typeof c?Ed(c,a,b):C(lc,c)?mc.c(c,a,b):Md.c(a,b,c)};Kb.A=3;function me(a){return a}function ne(a,b,c,d){a=a.a?a.a(b):a.call(null,b);c=Kb.c(a,c,d);return a.a?a.a(c):a.call(null,c)}pb.Cd;oe;function oe(a,b){return(a%b+b)%b}function pe(a){a=(a-a%2)/2;return 0<=a?Math.floor(a):Math.ceil(a)}function qe(a){a-=a>>1&1431655765;a=(a&858993459)+(a>>2&858993459);return 16843009*(a+(a>>4)&252645135)>>24}
function re(a){var b=1;for(a=I(a);;)if(a&&0<b)--b,a=L(a);else return a}var E=function E(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return E.w();case 1:return E.a(arguments[0]);default:return E.o(arguments[0],new jd(c.slice(1),0))}};E.w=function(){return""};E.a=function(a){return null==a?"":""+a};E.o=function(a,b){for(var c=new ob(""+E(a)),d=b;;)if(y(d))c=c.append(""+E(J(d))),d=L(d);else return c.toString()};
E.G=function(a){var b=J(a);a=L(a);return E.o(b,a)};E.A=1;se;te;function wd(a,b){var c;if(Yd(b))if(Jd(a)&&Jd(b)&&O(a)!==O(b))c=!1;else a:{c=I(a);for(var d=I(b);;){if(null==c){c=null==d;break a}if(null!=d&&Zc.b(J(c),J(d)))c=L(c),d=L(d);else{c=!1;break a}}}else c=null;return he(c)}function Gd(a){if(I(a)){var b=dd(J(a));for(a=L(a);;){if(null==a)return b;b=ed(b,dd(J(a)));a=L(a)}}else return 0}ue;ve;te;we;xe;
function Id(a,b,c,d,e){this.u=a;this.first=b;this.ua=c;this.count=d;this.s=e;this.i=65937646;this.B=8192}h=Id.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return 1===this.count?null:this.ua};h.X=function(){return this.count};h.Wa=function(){return this.first};h.Xa=function(){return Sb(this)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};
h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return this.first};h.sa=function(){return 1===this.count?ld:this.ua};h.S=function(){return this};h.T=function(a,b){return new Id(b,this.first,this.ua,this.count,this.s)};h.U=function(a,b){return new Id(this.u,b,this,this.count+1,null)};Id.prototype[Hb]=function(){return nd(this)};function ye(a){this.u=a;this.i=65937614;this.B=8192}h=ye.prototype;h.toString=function(){return Rc(this)};
h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return null};h.X=function(){return 0};h.Wa=function(){return null};h.Xa=function(){throw Error("Can't pop empty list");};h.N=function(){return sd};h.v=function(a,b){return(null!=b?b.i&33554432||b.ud||(b.i?0:C(tc,b)):C(tc,b))||Yd(b)?null==I(b):!1};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return null};h.sa=function(){return ld};h.S=function(){return null};
h.T=function(a,b){return new ye(b)};h.U=function(a,b){return new Id(this.u,b,null,1,null)};var ld=new ye(null);ye.prototype[Hb]=function(){return nd(this)};function ze(a){return(null!=a?a.i&134217728||a.vd||(a.i?0:C(uc,a)):C(uc,a))?vc(a):Kb.c(Od,ld,a)}var Xc=function Xc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Xc.o(0<c.length?new jd(c.slice(0),0):null)};
Xc.o=function(a){var b;if(a instanceof jd&&0===a.l)b=a.f;else a:for(b=[];;)if(null!=a)b.push(a.aa(null)),a=a.ra(null);else break a;a=b.length;for(var c=ld;;)if(0<a){var d=a-1,c=c.U(null,b[a-1]);a=d}else return c};Xc.A=0;Xc.G=function(a){return Xc.o(I(a))};function Ae(a,b,c,d){this.u=a;this.first=b;this.ua=c;this.s=d;this.i=65929452;this.B=8192}h=Ae.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.ra=function(){return null==this.ua?null:I(this.ua)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return this.first};h.sa=function(){return null==this.ua?ld:this.ua};h.S=function(){return this};h.T=function(a,b){return new Ae(b,this.first,this.ua,this.s)};h.U=function(a,b){return new Ae(null,b,this,this.s)};Ae.prototype[Hb]=function(){return nd(this)};
function N(a,b){var c=null==b;return(c?c:null!=b&&(b.i&64||b.hb))?new Ae(null,a,b,null):new Ae(null,a,I(b),null)}function Be(a,b){if(a.Ja===b.Ja)return 0;var c=Fb(a.qa);if(y(c?b.qa:c))return-1;if(y(a.qa)){if(Fb(b.qa))return 1;c=Qa(a.qa,b.qa);return 0===c?Qa(a.name,b.name):c}return Qa(a.name,b.name)}function B(a,b,c,d){this.qa=a;this.name=b;this.Ja=c;this.eb=d;this.i=2153775105;this.B=4096}h=B.prototype;h.toString=function(){return[E(":"),E(this.Ja)].join("")};
h.equiv=function(a){return this.v(null,a)};h.v=function(a,b){return b instanceof B?this.Ja===b.Ja:!1};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return gd.b(c,this);case 3:return gd.c(c,this,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return gd.b(c,this)};a.c=function(a,c,d){return gd.c(c,this,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return gd.b(a,this)};
h.b=function(a,b){return gd.c(a,this,b)};h.N=function(){var a=this.eb;return null!=a?a:this.eb=a=ed(Wc(this.name),cd(this.qa))+2654435769|0};h.vb=function(){return this.name};h.wb=function(){return this.qa};h.L=function(a,b){return wc(b,[E(":"),E(this.Ja)].join(""))};
var Ce=function Ce(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Ce.a(arguments[0]);case 2:return Ce.b(arguments[0],arguments[1]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
Ce.a=function(a){if(a instanceof B)return a;if(a instanceof Yc){var b;if(null!=a&&(a.B&4096||a.Uc))b=a.wb(null);else throw Error([E("Doesn't support namespace: "),E(a)].join(""));return new B(b,te.a?te.a(a):te.call(null,a),a.La,null)}return"string"===typeof a?(b=a.split("/"),2===b.length?new B(b[0],b[1],a,null):new B(null,b[0],a,null)):null};Ce.b=function(a,b){return new B(a,b,[E(y(a)?[E(a),E("/")].join(""):null),E(b)].join(""),null)};Ce.A=2;
function De(a,b,c,d){this.u=a;this.jb=b;this.D=c;this.s=d;this.i=32374988;this.B=0}h=De.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};function Ee(a){null!=a.jb&&(a.D=a.jb.w?a.jb.w():a.jb.call(null),a.jb=null);return a.D}h.R=function(){return this.u};h.ra=function(){rc(this);return null==this.D?null:L(this.D)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};
h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){rc(this);return null==this.D?null:J(this.D)};h.sa=function(){rc(this);return null!=this.D?kd(this.D):ld};h.S=function(){Ee(this);if(null==this.D)return null;for(var a=this.D;;)if(a instanceof De)a=Ee(a);else return this.D=a,I(this.D)};h.T=function(a,b){return new De(b,this.jb,this.D,this.s)};h.U=function(a,b){return N(b,this)};De.prototype[Hb]=function(){return nd(this)};Fe;function Ge(a,b){this.fc=a;this.end=b;this.i=2;this.B=0}
Ge.prototype.add=function(a){this.fc[this.end]=a;return this.end+=1};Ge.prototype.Ia=function(){var a=new Fe(this.fc,0,this.end);this.fc=null;return a};Ge.prototype.X=function(){return this.end};function Fe(a,b,c){this.f=a;this.ba=b;this.end=c;this.i=524306;this.B=0}h=Fe.prototype;h.X=function(){return this.end-this.ba};h.O=function(a,b){return this.f[this.ba+b]};h.wa=function(a,b,c){return 0<=b&&b<this.end-this.ba?this.f[this.ba+b]:c};
h.sc=function(){if(this.ba===this.end)throw Error("-drop-first of empty chunk");return new Fe(this.f,this.ba+1,this.end)};h.Z=function(a,b){return Fd(this.f,b,this.f[this.ba],this.ba+1)};h.$=function(a,b,c){return Fd(this.f,b,c,this.ba)};function ae(a,b,c,d){this.Ia=a;this.Ka=b;this.u=c;this.s=d;this.i=31850732;this.B=1536}h=ae.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.ra=function(){if(1<Mb(this.Ia))return new ae(Hc(this.Ia),this.Ka,this.u,null);var a=rc(this.Ka);return null==a?null:a};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.aa=function(){return F.b(this.Ia,0)};h.sa=function(){return 1<Mb(this.Ia)?new ae(Hc(this.Ia),this.Ka,this.u,null):null==this.Ka?ld:this.Ka};h.S=function(){return this};h.jc=function(){return this.Ia};h.kc=function(){return null==this.Ka?ld:this.Ka};
h.T=function(a,b){return new ae(this.Ia,this.Ka,b,this.s)};h.U=function(a,b){return N(b,this)};h.ic=function(){return null==this.Ka?null:this.Ka};ae.prototype[Hb]=function(){return nd(this)};function He(a,b){return 0===Mb(a)?b:new ae(a,b,null,null)}function Ie(a,b){a.add(b)}function we(a){return Ic(a)}function xe(a){return Jc(a)}function ke(a){for(var b=[];;)if(I(a))b.push(J(a)),a=L(a);else return b}
function Je(a,b){if(Jd(a))return O(a);for(var c=a,d=b,e=0;;)if(0<d&&I(c))c=L(c),--d,e+=1;else return e}var Ke=function Ke(b){return null==b?null:null==L(b)?I(J(b)):N(J(b),Ke(L(b)))};function Le(a){return Bc(a)}var Me=function Me(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Me.w();case 1:return Me.a(arguments[0]);case 2:return Me.b(arguments[0],arguments[1]);default:return Me.o(arguments[0],arguments[1],new jd(c.slice(2),0))}};
Me.w=function(){return zc(Pd)};Me.a=function(a){return a};Me.b=function(a,b){return Ac(a,b)};Me.o=function(a,b,c){for(;;)if(a=Ac(a,b),y(c))b=J(c),c=L(c);else return a};Me.G=function(a){var b=J(a),c=L(a);a=J(c);c=L(c);return Me.o(b,a,c)};Me.A=2;
function Ne(a,b,c){var d=I(c);if(0===b)return a.w?a.w():a.call(null);c=Rb(d);var e=Sb(d);if(1===b)return a.a?a.a(c):a.a?a.a(c):a.call(null,c);var d=Rb(e),f=Sb(e);if(2===b)return a.b?a.b(c,d):a.b?a.b(c,d):a.call(null,c,d);var e=Rb(f),g=Sb(f);if(3===b)return a.c?a.c(c,d,e):a.c?a.c(c,d,e):a.call(null,c,d,e);var f=Rb(g),k=Sb(g);if(4===b)return a.m?a.m(c,d,e,f):a.m?a.m(c,d,e,f):a.call(null,c,d,e,f);var g=Rb(k),l=Sb(k);if(5===b)return a.C?a.C(c,d,e,f,g):a.C?a.C(c,d,e,f,g):a.call(null,c,d,e,f,g);var k=Rb(l),
m=Sb(l);if(6===b)return a.V?a.V(c,d,e,f,g,k):a.V?a.V(c,d,e,f,g,k):a.call(null,c,d,e,f,g,k);var l=Rb(m),n=Sb(m);if(7===b)return a.W?a.W(c,d,e,f,g,k,l):a.W?a.W(c,d,e,f,g,k,l):a.call(null,c,d,e,f,g,k,l);var m=Rb(n),p=Sb(n);if(8===b)return a.na?a.na(c,d,e,f,g,k,l,m):a.na?a.na(c,d,e,f,g,k,l,m):a.call(null,c,d,e,f,g,k,l,m);var n=Rb(p),q=Sb(p);if(9===b)return a.oa?a.oa(c,d,e,f,g,k,l,m,n):a.oa?a.oa(c,d,e,f,g,k,l,m,n):a.call(null,c,d,e,f,g,k,l,m,n);var p=Rb(q),r=Sb(q);if(10===b)return a.ca?a.ca(c,d,e,f,g,
k,l,m,n,p):a.ca?a.ca(c,d,e,f,g,k,l,m,n,p):a.call(null,c,d,e,f,g,k,l,m,n,p);var q=Rb(r),v=Sb(r);if(11===b)return a.da?a.da(c,d,e,f,g,k,l,m,n,p,q):a.da?a.da(c,d,e,f,g,k,l,m,n,p,q):a.call(null,c,d,e,f,g,k,l,m,n,p,q);var r=Rb(v),w=Sb(v);if(12===b)return a.ea?a.ea(c,d,e,f,g,k,l,m,n,p,q,r):a.ea?a.ea(c,d,e,f,g,k,l,m,n,p,q,r):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r);var v=Rb(w),x=Sb(w);if(13===b)return a.fa?a.fa(c,d,e,f,g,k,l,m,n,p,q,r,v):a.fa?a.fa(c,d,e,f,g,k,l,m,n,p,q,r,v):a.call(null,c,d,e,f,g,k,l,m,n,p,q,
r,v);var w=Rb(x),A=Sb(x);if(14===b)return a.ga?a.ga(c,d,e,f,g,k,l,m,n,p,q,r,v,w):a.ga?a.ga(c,d,e,f,g,k,l,m,n,p,q,r,v,w):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,v,w);var x=Rb(A),G=Sb(A);if(15===b)return a.ha?a.ha(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):a.ha?a.ha(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x);var A=Rb(G),K=Sb(G);if(16===b)return a.ia?a.ia(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):a.ia?a.ia(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A);var G=Rb(K),
T=Sb(K);if(17===b)return a.ja?a.ja(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G):a.ja?a.ja(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G);var K=Rb(T),pa=Sb(T);if(18===b)return a.ka?a.ka(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K):a.ka?a.ka(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K);T=Rb(pa);pa=Sb(pa);if(19===b)return a.la?a.la(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T):a.la?a.la(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T):a.call(null,c,d,e,f,g,k,
l,m,n,p,q,r,v,w,x,A,G,K,T);var z=Rb(pa);Sb(pa);if(20===b)return a.ma?a.ma(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T,z):a.ma?a.ma(c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T,z):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T,z);throw Error("Only up to 20 arguments supported on functions");}
var Jb=function Jb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Jb.b(arguments[0],arguments[1]);case 3:return Jb.c(arguments[0],arguments[1],arguments[2]);case 4:return Jb.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Jb.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:return Jb.o(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],new jd(c.slice(5),0))}};
Jb.b=function(a,b){var c=a.A;if(a.G){var d=Je(b,c+1);return d<=c?Ne(a,d,b):a.G(b)}return a.apply(a,ke(b))};Jb.c=function(a,b,c){b=N(b,c);c=a.A;if(a.G){var d=Je(b,c+1);return d<=c?Ne(a,d,b):a.G(b)}return a.apply(a,ke(b))};Jb.m=function(a,b,c,d){b=N(b,N(c,d));c=a.A;return a.G?(d=Je(b,c+1),d<=c?Ne(a,d,b):a.G(b)):a.apply(a,ke(b))};Jb.C=function(a,b,c,d,e){b=N(b,N(c,N(d,e)));c=a.A;return a.G?(d=Je(b,c+1),d<=c?Ne(a,d,b):a.G(b)):a.apply(a,ke(b))};
Jb.o=function(a,b,c,d,e,f){b=N(b,N(c,N(d,N(e,Ke(f)))));c=a.A;return a.G?(d=Je(b,c+1),d<=c?Ne(a,d,b):a.G(b)):a.apply(a,ke(b))};Jb.G=function(a){var b=J(a),c=L(a);a=J(c);var d=L(c),c=J(d),e=L(d),d=J(e),f=L(e),e=J(f),f=L(f);return Jb.o(b,a,c,d,e,f)};Jb.A=5;
var Oe=function Oe(){"undefined"===typeof qb&&(qb=function(b,c){this.kd=b;this.hd=c;this.i=393216;this.B=0},qb.prototype.T=function(b,c){return new qb(this.kd,c)},qb.prototype.R=function(){return this.hd},qb.prototype.xa=function(){return!1},qb.prototype.next=function(){return Error("No such element")},qb.prototype.remove=function(){return Error("Unsupported operation")},qb.Dd=function(){return new Q(null,2,5,R,[yd(Pe,new u(null,1,[Qe,Xc(Re,Xc(Pd))],null)),pb.Bd],null)},qb.yc=!0,qb.Sb="cljs.core/t_cljs$core4826",
qb.bd=function(b){return wc(b,"cljs.core/t_cljs$core4826")});return new qb(Oe,Se)};Te;function Te(a,b,c,d){this.nb=a;this.first=b;this.ua=c;this.u=d;this.i=31719628;this.B=0}h=Te.prototype;h.T=function(a,b){return new Te(this.nb,this.first,this.ua,b)};h.U=function(a,b){return N(b,rc(this))};h.v=function(a,b){return null!=rc(this)?wd(this,b):Yd(b)&&null==I(b)};h.N=function(){return rd(this)};h.S=function(){null!=this.nb&&this.nb.step(this);return null==this.ua?null:this};
h.aa=function(){null!=this.nb&&rc(this);return null==this.ua?null:this.first};h.sa=function(){null!=this.nb&&rc(this);return null==this.ua?ld:this.ua};h.ra=function(){null!=this.nb&&rc(this);return null==this.ua?null:rc(this.ua)};Te.prototype[Hb]=function(){return nd(this)};function Ue(a,b){for(;;){if(null==I(b))return!0;var c;c=J(b);c=a.a?a.a(c):a.call(null,c);if(y(c)){c=a;var d=L(b);a=c;b=d}else return!1}}
function Ve(a){for(var b=me;;)if(I(a)){var c;c=J(a);c=b.a?b.a(c):b.call(null,c);if(y(c))return c;a=L(a)}else return null}var We=function We(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return We.w();case 1:return We.a(arguments[0]);case 2:return We.b(arguments[0],arguments[1]);case 3:return We.c(arguments[0],arguments[1],arguments[2]);default:return We.o(arguments[0],arguments[1],arguments[2],new jd(c.slice(3),0))}};We.w=function(){return me};
We.a=function(a){return a};
We.b=function(a,b){return function(){function c(c,d,e){c=b.c?b.c(c,d,e):b.call(null,c,d,e);return a.a?a.a(c):a.call(null,c)}function d(c,d){var e=b.b?b.b(c,d):b.call(null,c,d);return a.a?a.a(e):a.call(null,e)}function e(c){c=b.a?b.a(c):b.call(null,c);return a.a?a.a(c):a.call(null,c)}function f(){var c=b.w?b.w():b.call(null);return a.a?a.a(c):a.call(null,c)}var g=null,k=function(){function c(a,b,e,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+
3],++g;g=new jd(k,0)}return d.call(this,a,b,e,g)}function d(c,e,f,g){c=Jb.C(b,c,e,f,g);return a.a?a.a(c):a.call(null,c)}c.A=3;c.G=function(a){var b=J(a);a=L(a);var c=J(a);a=L(a);var e=J(a);a=kd(a);return d(b,c,e,a)};c.o=d;return c}(),g=function(a,b,g,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,g);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+
3],++q;q=new jd(r,0)}return k.o(a,b,g,q)}throw Error("Invalid arity: "+arguments.length);};g.A=3;g.G=k.G;g.w=f;g.a=e;g.b=d;g.c=c;g.o=k.o;return g}()};
We.c=function(a,b,c){return function(){function d(d,e,f){d=c.c?c.c(d,e,f):c.call(null,d,e,f);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function e(d,e){var f;f=c.b?c.b(d,e):c.call(null,d,e);f=b.a?b.a(f):b.call(null,f);return a.a?a.a(f):a.call(null,f)}function f(d){d=c.a?c.a(d):c.call(null,d);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function g(){var d;d=c.w?c.w():c.call(null);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}var k=null,l=function(){function d(a,
b,c,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+3],++g;g=new jd(k,0)}return e.call(this,a,b,c,g)}function e(d,f,g,k){d=Jb.C(c,d,f,g,k);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}d.A=3;d.G=function(a){var b=J(a);a=L(a);var c=J(a);a=L(a);var d=J(a);a=kd(a);return e(b,c,d,a)};d.o=e;return d}(),k=function(a,b,c,k){switch(arguments.length){case 0:return g.call(this);case 1:return f.call(this,a);case 2:return e.call(this,a,
b);case 3:return d.call(this,a,b,c);default:var r=null;if(3<arguments.length){for(var r=0,v=Array(arguments.length-3);r<v.length;)v[r]=arguments[r+3],++r;r=new jd(v,0)}return l.o(a,b,c,r)}throw Error("Invalid arity: "+arguments.length);};k.A=3;k.G=l.G;k.w=g;k.a=f;k.b=e;k.c=d;k.o=l.o;return k}()};
We.o=function(a,b,c,d){return function(a){return function(){function b(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new jd(e,0)}return c.call(this,d)}function c(b){b=Jb.b(J(a),b);for(var d=L(a);;)if(d)b=J(d).call(null,b),d=L(d);else return b}b.A=0;b.G=function(a){a=I(a);return c(a)};b.o=c;return b}()}(ze(N(a,N(b,N(c,d)))))};We.G=function(a){var b=J(a),c=L(a);a=J(c);var d=L(c),c=J(d),d=L(d);return We.o(b,a,c,d)};We.A=3;
function Xe(a,b){return function(){function c(c,d,e){return a.m?a.m(b,c,d,e):a.call(null,b,c,d,e)}function d(c,d){return a.c?a.c(b,c,d):a.call(null,b,c,d)}function e(c){return a.b?a.b(b,c):a.call(null,b,c)}function f(){return a.a?a.a(b):a.call(null,b)}var g=null,k=function(){function c(a,b,e,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+3],++g;g=new jd(k,0)}return d.call(this,a,b,e,g)}function d(c,e,f,g){return Jb.o(a,b,c,e,f,H([g],0))}c.A=
3;c.G=function(a){var b=J(a);a=L(a);var c=J(a);a=L(a);var e=J(a);a=kd(a);return d(b,c,e,a)};c.o=d;return c}(),g=function(a,b,g,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,g);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+3],++q;q=new jd(r,0)}return k.o(a,b,g,q)}throw Error("Invalid arity: "+arguments.length);};g.A=3;g.G=k.G;g.w=f;g.a=
e;g.b=d;g.c=c;g.o=k.o;return g}()}Ye;function Ze(a,b,c,d){this.state=a;this.u=b;this.pd=c;this.Kc=d;this.B=16386;this.i=6455296}h=Ze.prototype;h.equiv=function(a){return this.v(null,a)};h.v=function(a,b){return this===b};h.Pb=function(){return this.state};h.R=function(){return this.u};
h.wc=function(a,b,c){a=I(this.Kc);for(var d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=P(g,0),g=P(g,1);g.m?g.m(k,this,b,c):g.call(null,k,this,b,c);f+=1}else if(a=I(a))ce(a)?(d=Ic(a),a=Jc(a),k=d,e=O(d),d=k):(d=J(a),k=P(d,0),g=P(d,1),g.m?g.m(k,this,b,c):g.call(null,k,this,b,c),a=L(a),d=null,e=0),f=0;else return null};h.N=function(){return la(this)};
var V=function V(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return V.a(arguments[0]);default:return V.o(arguments[0],new jd(c.slice(1),0))}};V.a=function(a){return new Ze(a,null,null,null)};V.o=function(a,b){var c=null!=b&&(b.i&64||b.hb)?Jb.b(vd,b):b,d=gd.b(c,yb),c=gd.b(c,$e);return new Ze(a,d,c,null)};V.G=function(a){var b=J(a);a=L(a);return V.o(b,a)};V.A=1;af;
function bf(a,b){if(a instanceof Ze){var c=a.pd;if(null!=c&&!y(c.a?c.a(b):c.call(null,b)))throw Error([E("Assert failed: "),E("Validator rejected reference state"),E("\n"),E(function(){var a=Xc(cf,df);return af.a?af.a(a):af.call(null,a)}())].join(""));c=a.state;a.state=b;null!=a.Kc&&yc(a,c,b);return b}return Nc(a,b)}
var ef=function ef(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ef.b(arguments[0],arguments[1]);case 3:return ef.c(arguments[0],arguments[1],arguments[2]);case 4:return ef.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return ef.o(arguments[0],arguments[1],arguments[2],arguments[3],new jd(c.slice(4),0))}};ef.b=function(a,b){var c;a instanceof Ze?(c=a.state,c=b.a?b.a(c):b.call(null,c),c=bf(a,c)):c=Oc.b(a,b);return c};
ef.c=function(a,b,c){if(a instanceof Ze){var d=a.state;b=b.b?b.b(d,c):b.call(null,d,c);a=bf(a,b)}else a=Oc.c(a,b,c);return a};ef.m=function(a,b,c,d){if(a instanceof Ze){var e=a.state;b=b.c?b.c(e,c,d):b.call(null,e,c,d);a=bf(a,b)}else a=Oc.m(a,b,c,d);return a};ef.o=function(a,b,c,d,e){return a instanceof Ze?bf(a,Jb.C(b,a.state,c,d,e)):Oc.C(a,b,c,d,e)};ef.G=function(a){var b=J(a),c=L(a);a=J(c);var d=L(c),c=J(d),e=L(d),d=J(e),e=L(e);return ef.o(b,a,c,d,e)};ef.A=4;
function ff(a){this.state=a;this.i=32768;this.B=0}ff.prototype.Pb=function(){return this.state};function Ye(a){return new ff(a)}
var se=function se(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return se.a(arguments[0]);case 2:return se.b(arguments[0],arguments[1]);case 3:return se.c(arguments[0],arguments[1],arguments[2]);case 4:return se.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return se.o(arguments[0],arguments[1],arguments[2],arguments[3],new jd(c.slice(4),0))}};
se.a=function(a){return function(b){return function(){function c(c,d){var e=a.a?a.a(d):a.call(null,d);return b.b?b.b(c,e):b.call(null,c,e)}function d(a){return b.a?b.a(a):b.call(null,a)}function e(){return b.w?b.w():b.call(null)}var f=null,g=function(){function c(a,b,e){var f=null;if(2<arguments.length){for(var f=0,g=Array(arguments.length-2);f<g.length;)g[f]=arguments[f+2],++f;f=new jd(g,0)}return d.call(this,a,b,f)}function d(c,e,f){e=Jb.c(a,e,f);return b.b?b.b(c,e):b.call(null,c,e)}c.A=2;c.G=function(a){var b=
J(a);a=L(a);var c=J(a);a=kd(a);return d(b,c,a)};c.o=d;return c}(),f=function(a,b,f){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b);default:var n=null;if(2<arguments.length){for(var n=0,p=Array(arguments.length-2);n<p.length;)p[n]=arguments[n+2],++n;n=new jd(p,0)}return g.o(a,b,n)}throw Error("Invalid arity: "+arguments.length);};f.A=2;f.G=g.G;f.w=e;f.a=d;f.b=c;f.o=g.o;return f}()}};
se.b=function(a,b){return new De(null,function(){var c=I(b);if(c){if(ce(c)){for(var d=Ic(c),e=O(d),f=new Ge(Array(e),0),g=0;;)if(g<e)Ie(f,function(){var b=F.b(d,g);return a.a?a.a(b):a.call(null,b)}()),g+=1;else break;return He(f.Ia(),se.b(a,Jc(c)))}return N(function(){var b=J(c);return a.a?a.a(b):a.call(null,b)}(),se.b(a,kd(c)))}return null},null,null)};
se.c=function(a,b,c){return new De(null,function(){var d=I(b),e=I(c);if(d&&e){var f=N,g;g=J(d);var k=J(e);g=a.b?a.b(g,k):a.call(null,g,k);d=f(g,se.c(a,kd(d),kd(e)))}else d=null;return d},null,null)};se.m=function(a,b,c,d){return new De(null,function(){var e=I(b),f=I(c),g=I(d);if(e&&f&&g){var k=N,l;l=J(e);var m=J(f),n=J(g);l=a.c?a.c(l,m,n):a.call(null,l,m,n);e=k(l,se.m(a,kd(e),kd(f),kd(g)))}else e=null;return e},null,null)};
se.o=function(a,b,c,d,e){var f=function k(a){return new De(null,function(){var b=se.b(I,a);return Ue(me,b)?N(se.b(J,b),k(se.b(kd,b))):null},null,null)};return se.b(function(){return function(b){return Jb.b(a,b)}}(f),f(Od.o(e,d,H([c,b],0))))};se.G=function(a){var b=J(a),c=L(a);a=J(c);var d=L(c),c=J(d),e=L(d),d=J(e),e=L(e);return se.o(b,a,c,d,e)};se.A=4;gf;
function hf(a,b){return new De(null,function(){var c=I(b);if(c){if(ce(c)){for(var d=Ic(c),e=O(d),f=new Ge(Array(e),0),g=0;;)if(g<e){var k;k=F.b(d,g);k=a.a?a.a(k):a.call(null,k);y(k)&&(k=F.b(d,g),f.add(k));g+=1}else break;return He(f.Ia(),hf(a,Jc(c)))}d=J(c);c=kd(c);return y(a.a?a.a(d):a.call(null,d))?N(d,hf(a,c)):hf(a,c)}return null},null,null)}
var jf=function jf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return jf.b(arguments[0],arguments[1]);case 3:return jf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};jf.b=function(a,b){return null!=a?null!=a&&(a.B&4||a.Oc)?yd(Le(Kb.c(Ac,zc(a),b)),Wd(a)):Kb.c(Ob,a,b):Kb.c(Od,ld,b)};
jf.c=function(a,b,c){return null!=a&&(a.B&4||a.Oc)?yd(Le(ne(b,Me,zc(a),c)),Wd(a)):ne(b,Od,a,c)};jf.A=3;function kf(a,b){return Le(Kb.c(function(b,d){return Me.b(b,a.a?a.a(d):a.call(null,d))},zc(Pd),b))}function lf(a,b){var c;a:{c=fe;for(var d=a,e=I(b);;)if(e)if(null!=d?d.i&256||d.uc||(d.i?0:C(Ub,d)):C(Ub,d)){d=gd.c(d,J(e),c);if(c===d){c=null;break a}e=L(e)}else{c=null;break a}else{c=d;break a}}return c}
var mf=function mf(b,c,d){var e=P(c,0);c=re(c);return y(c)?Td.c(b,e,mf(gd.b(b,e),c,d)):Td.c(b,e,d)};function nf(a,b){this.M=a;this.f=b}function of(a){return new nf(a,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null])}function pf(a){return new nf(a.M,Ib(a.f))}function qf(a){a=a.j;return 32>a?0:a-1>>>5<<5}function rf(a,b,c){for(;;){if(0===b)return c;var d=of(a);d.f[0]=c;c=d;b-=5}}
var sf=function sf(b,c,d,e){var f=pf(d),g=b.j-1>>>c&31;5===c?f.f[g]=e:(d=d.f[g],b=null!=d?sf(b,c-5,d,e):rf(null,c-5,e),f.f[g]=b);return f};function uf(a,b){throw Error([E("No item "),E(a),E(" in vector of length "),E(b)].join(""));}function vf(a,b){if(b>=qf(a))return a.pa;for(var c=a.root,d=a.shift;;)if(0<d)var e=d-5,c=c.f[b>>>d&31],d=e;else return c.f}function wf(a,b){return 0<=b&&b<a.j?vf(a,b):uf(b,a.j)}
var xf=function xf(b,c,d,e,f){var g=pf(d);if(0===c)g.f[e&31]=f;else{var k=e>>>c&31;b=xf(b,c-5,d.f[k],e,f);g.f[k]=b}return g},yf=function yf(b,c,d){var e=b.j-2>>>c&31;if(5<c){b=yf(b,c-5,d.f[e]);if(null==b&&0===e)return null;d=pf(d);d.f[e]=b;return d}if(0===e)return null;d=pf(d);d.f[e]=null;return d};function zf(a,b,c,d,e,f){this.l=a;this.Mb=b;this.f=c;this.Ca=d;this.start=e;this.end=f}zf.prototype.xa=function(){return this.l<this.end};
zf.prototype.next=function(){32===this.l-this.Mb&&(this.f=vf(this.Ca,this.l),this.Mb+=32);var a=this.f[this.l&31];this.l+=1;return a};Af;Bf;Cf;M;Df;Ef;Ff;function Q(a,b,c,d,e,f){this.u=a;this.j=b;this.shift=c;this.root=d;this.pa=e;this.s=f;this.i=167668511;this.B=8196}h=Q.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){return"number"===typeof b?F.c(this,b,c):c};
h.O=function(a,b){return wf(this,b)[b&31]};h.wa=function(a,b,c){return 0<=b&&b<this.j?vf(this,b)[b&31]:c};h.Ya=function(a,b,c){if(0<=b&&b<this.j)return qf(this)<=b?(a=Ib(this.pa),a[b&31]=c,new Q(this.u,this.j,this.shift,this.root,a,null)):new Q(this.u,this.j,this.shift,xf(this,this.shift,this.root,b,c),this.pa,null);if(b===this.j)return Ob(this,c);throw Error([E("Index "),E(b),E(" out of bounds  [0,"),E(this.j),E("]")].join(""));};
h.Ma=function(){var a=this.j;return new zf(0,0,0<O(this)?vf(this,0):null,this,0,a)};h.R=function(){return this.u};h.X=function(){return this.j};h.tb=function(){return F.b(this,0)};h.ub=function(){return F.b(this,1)};h.Wa=function(){return 0<this.j?F.b(this,this.j-1):null};
h.Xa=function(){if(0===this.j)throw Error("Can't pop empty vector");if(1===this.j)return kc(Pd,this.u);if(1<this.j-qf(this))return new Q(this.u,this.j-1,this.shift,this.root,this.pa.slice(0,-1),null);var a=vf(this,this.j-2),b=yf(this,this.shift,this.root),b=null==b?R:b,c=this.j-1;return 5<this.shift&&null==b.f[1]?new Q(this.u,c,this.shift-5,b.f[0],a,null):new Q(this.u,c,this.shift,b,a,null)};h.Rb=function(){return 0<this.j?new Hd(this,this.j-1,null):null};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){if(b instanceof Q)if(this.j===O(b))for(var c=Pc(this),d=Pc(b);;)if(y(c.xa())){var e=c.next(),f=d.next();if(!Zc.b(e,f))return!1}else return!0;else return!1;else return wd(this,b)};h.gb=function(){return new Cf(this.j,this.shift,Af.a?Af.a(this.root):Af.call(null,this.root),Bf.a?Bf.a(this.pa):Bf.call(null,this.pa))};h.Z=function(a,b){return Bd(this,b)};
h.$=function(a,b,c){a=0;for(var d=c;;)if(a<this.j){var e=vf(this,a);c=e.length;a:for(var f=0;;)if(f<c){var g=e[f],d=b.b?b.b(d,g):b.call(null,d,g);if(Ad(d)){e=d;break a}f+=1}else{e=d;break a}if(Ad(e))return M.a?M.a(e):M.call(null,e);a+=c;d=e}else return d};h.Va=function(a,b,c){if("number"===typeof b)return gc(this,b,c);throw Error("Vector's key for assoc must be a number.");};
h.S=function(){if(0===this.j)return null;if(32>=this.j)return new jd(this.pa,0);var a;a:{a=this.root;for(var b=this.shift;;)if(0<b)b-=5,a=a.f[0];else{a=a.f;break a}}return Ff.m?Ff.m(this,a,0,0):Ff.call(null,this,a,0,0)};h.T=function(a,b){return new Q(b,this.j,this.shift,this.root,this.pa,this.s)};
h.U=function(a,b){if(32>this.j-qf(this)){for(var c=this.pa.length,d=Array(c+1),e=0;;)if(e<c)d[e]=this.pa[e],e+=1;else break;d[c]=b;return new Q(this.u,this.j+1,this.shift,this.root,d,null)}c=(d=this.j>>>5>1<<this.shift)?this.shift+5:this.shift;d?(d=of(null),d.f[0]=this.root,e=rf(null,this.shift,new nf(null,this.pa)),d.f[1]=e):d=sf(this,this.shift,this.root,new nf(null,this.pa));return new Q(this.u,this.j+1,c,d,[b],null)};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.wa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.wa(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return this.O(null,a)};h.b=function(a,b){return this.wa(null,a,b)};
var R=new nf(null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]),Pd=new Q(null,0,5,R,[],sd);Q.prototype[Hb]=function(){return nd(this)};function le(a){if(Db(a))a:{var b=a.length;if(32>b)a=new Q(null,b,5,R,a,null);else for(var c=32,d=(new Q(null,32,5,R,a.slice(0,32),null)).gb(null);;)if(c<b)var e=c+1,d=Me.b(d,a[c]),c=e;else{a=Bc(d);break a}}else a=Bc(Kb.c(Ac,zc(Pd),a));return a}Gf;
function be(a,b,c,d,e,f){this.Aa=a;this.node=b;this.l=c;this.ba=d;this.u=e;this.s=f;this.i=32375020;this.B=1536}h=be.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){if(this.ba+1<this.node.length){var a;a=this.Aa;var b=this.node,c=this.l,d=this.ba+1;a=Ff.m?Ff.m(a,b,c,d):Ff.call(null,a,b,c,d);return null==a?null:a}return Kc(this)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};
h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){var c;c=this.Aa;var d=this.l+this.ba,e=O(this.Aa);c=Gf.c?Gf.c(c,d,e):Gf.call(null,c,d,e);return Bd(c,b)};h.$=function(a,b,c){a=this.Aa;var d=this.l+this.ba,e=O(this.Aa);a=Gf.c?Gf.c(a,d,e):Gf.call(null,a,d,e);return Cd(a,b,c)};h.aa=function(){return this.node[this.ba]};h.sa=function(){if(this.ba+1<this.node.length){var a;a=this.Aa;var b=this.node,c=this.l,d=this.ba+1;a=Ff.m?Ff.m(a,b,c,d):Ff.call(null,a,b,c,d);return null==a?ld:a}return Jc(this)};
h.S=function(){return this};h.jc=function(){var a=this.node;return new Fe(a,this.ba,a.length)};h.kc=function(){var a=this.l+this.node.length;if(a<Mb(this.Aa)){var b=this.Aa,c=vf(this.Aa,a);return Ff.m?Ff.m(b,c,a,0):Ff.call(null,b,c,a,0)}return ld};h.T=function(a,b){return Ff.C?Ff.C(this.Aa,this.node,this.l,this.ba,b):Ff.call(null,this.Aa,this.node,this.l,this.ba,b)};h.U=function(a,b){return N(b,this)};
h.ic=function(){var a=this.l+this.node.length;if(a<Mb(this.Aa)){var b=this.Aa,c=vf(this.Aa,a);return Ff.m?Ff.m(b,c,a,0):Ff.call(null,b,c,a,0)}return null};be.prototype[Hb]=function(){return nd(this)};
var Ff=function Ff(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Ff.c(arguments[0],arguments[1],arguments[2]);case 4:return Ff.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Ff.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};Ff.c=function(a,b,c){return new be(a,wf(a,b),b,c,null,null)};
Ff.m=function(a,b,c,d){return new be(a,b,c,d,null,null)};Ff.C=function(a,b,c,d,e){return new be(a,b,c,d,e,null)};Ff.A=5;Hf;function If(a,b,c,d,e){this.u=a;this.Ca=b;this.start=c;this.end=d;this.s=e;this.i=167666463;this.B=8192}h=If.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){return"number"===typeof b?F.c(this,b,c):c};
h.O=function(a,b){return 0>b||this.end<=this.start+b?uf(b,this.end-this.start):F.b(this.Ca,this.start+b)};h.wa=function(a,b,c){return 0>b||this.end<=this.start+b?c:F.c(this.Ca,this.start+b,c)};h.Ya=function(a,b,c){var d=this.start+b;a=this.u;c=Td.c(this.Ca,d,c);b=this.start;var e=this.end,d=d+1,d=e>d?e:d;return Hf.C?Hf.C(a,c,b,d,null):Hf.call(null,a,c,b,d,null)};h.R=function(){return this.u};h.X=function(){return this.end-this.start};h.Wa=function(){return F.b(this.Ca,this.end-1)};
h.Xa=function(){if(this.start===this.end)throw Error("Can't pop empty vector");var a=this.u,b=this.Ca,c=this.start,d=this.end-1;return Hf.C?Hf.C(a,b,c,d,null):Hf.call(null,a,b,c,d,null)};h.Rb=function(){return this.start!==this.end?new Hd(this,this.end-this.start-1,null):null};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Bd(this,b)};h.$=function(a,b,c){return Cd(this,b,c)};
h.Va=function(a,b,c){if("number"===typeof b)return gc(this,b,c);throw Error("Subvec's key for assoc must be a number.");};h.S=function(){var a=this;return function(b){return function d(e){return e===a.end?null:N(F.b(a.Ca,e),new De(null,function(){return function(){return d(e+1)}}(b),null,null))}}(this)(a.start)};h.T=function(a,b){return Hf.C?Hf.C(b,this.Ca,this.start,this.end,this.s):Hf.call(null,b,this.Ca,this.start,this.end,this.s)};
h.U=function(a,b){var c=this.u,d=gc(this.Ca,this.end,b),e=this.start,f=this.end+1;return Hf.C?Hf.C(c,d,e,f,null):Hf.call(null,c,d,e,f,null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.wa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.wa(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};
h.a=function(a){return this.O(null,a)};h.b=function(a,b){return this.wa(null,a,b)};If.prototype[Hb]=function(){return nd(this)};function Hf(a,b,c,d,e){for(;;)if(b instanceof If)c=b.start+c,d=b.start+d,b=b.Ca;else{var f=O(b);if(0>c||0>d||c>f||d>f)throw Error("Index out of bounds");return new If(a,b,c,d,e)}}
var Gf=function Gf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Gf.b(arguments[0],arguments[1]);case 3:return Gf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};Gf.b=function(a,b){return Gf.c(a,b,O(a))};Gf.c=function(a,b,c){return Hf(null,a,b,c,null)};Gf.A=3;function Jf(a,b){return a===b.M?b:new nf(a,Ib(b.f))}function Af(a){return new nf({},Ib(a.f))}
function Bf(a){var b=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];ee(a,0,b,0,a.length);return b}var Kf=function Kf(b,c,d,e){d=Jf(b.root.M,d);var f=b.j-1>>>c&31;if(5===c)b=e;else{var g=d.f[f];b=null!=g?Kf(b,c-5,g,e):rf(b.root.M,c-5,e)}d.f[f]=b;return d};function Cf(a,b,c,d){this.j=a;this.shift=b;this.root=c;this.pa=d;this.B=88;this.i=275}h=Cf.prototype;
h.yb=function(a,b){if(this.root.M){if(32>this.j-qf(this))this.pa[this.j&31]=b;else{var c=new nf(this.root.M,this.pa),d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];d[0]=b;this.pa=d;if(this.j>>>5>1<<this.shift){var d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],e=this.shift+
5;d[0]=this.root;d[1]=rf(this.root.M,this.shift,c);this.root=new nf(this.root.M,d);this.shift=e}else this.root=Kf(this,this.shift,this.root,c)}this.j+=1;return this}throw Error("conj! after persistent!");};h.zb=function(){if(this.root.M){this.root.M=null;var a=this.j-qf(this),b=Array(a);ee(this.pa,0,b,0,a);return new Q(null,this.j,this.shift,this.root,b,null)}throw Error("persistent! called twice");};
h.xb=function(a,b,c){if("number"===typeof b)return Dc(this,b,c);throw Error("TransientVector's key for assoc! must be a number.");};
h.vc=function(a,b,c){var d=this;if(d.root.M){if(0<=b&&b<d.j)return qf(this)<=b?d.pa[b&31]=c:(a=function(){return function f(a,k){var l=Jf(d.root.M,k);if(0===a)l.f[b&31]=c;else{var m=b>>>a&31,n=f(a-5,l.f[m]);l.f[m]=n}return l}}(this).call(null,d.shift,d.root),d.root=a),this;if(b===d.j)return Ac(this,c);throw Error([E("Index "),E(b),E(" out of bounds for TransientVector of length"),E(d.j)].join(""));}throw Error("assoc! after persistent!");};
h.X=function(){if(this.root.M)return this.j;throw Error("count after persistent!");};h.O=function(a,b){if(this.root.M)return wf(this,b)[b&31];throw Error("nth after persistent!");};h.wa=function(a,b,c){return 0<=b&&b<this.j?F.b(this,b):c};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){return"number"===typeof b?F.c(this,b,c):c};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};function Lf(){this.i=2097152;this.B=0}
Lf.prototype.equiv=function(a){return this.v(null,a)};Lf.prototype.v=function(){return!1};var Mf=new Lf;function Nf(a,b){return he(Zd(b)?O(a)===O(b)?Ue(me,se.b(function(a){return Zc.b(gd.c(b,J(a),Mf),Nd(a))},a)):null:null)}function Of(a){this.D=a}Of.prototype.next=function(){if(null!=this.D){var a=J(this.D),b=P(a,0),a=P(a,1);this.D=L(this.D);return{value:[b,a],done:!1}}return{value:null,done:!0}};function Pf(a){return new Of(I(a))}function Qf(a){this.D=a}
Qf.prototype.next=function(){if(null!=this.D){var a=J(this.D);this.D=L(this.D);return{value:[a,a],done:!1}}return{value:null,done:!0}};
function Rf(a,b){var c;if(b instanceof B)a:{c=a.length;for(var d=b.Ja,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof B&&d===a[e].Ja){c=e;break a}e+=2}}else if(ia(b)||"number"===typeof b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(b===a[d]){c=d;break a}d+=2}else if(b instanceof Yc)a:for(c=a.length,d=b.La,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof Yc&&d===a[e].La){c=e;break a}e+=2}else if(null==b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(null==a[d]){c=d;break a}d+=2}else a:for(c=a.length,
d=0;;){if(c<=d){c=-1;break a}if(Zc.b(b,a[d])){c=d;break a}d+=2}return c}Sf;function Tf(a,b,c){this.f=a;this.l=b;this.Ba=c;this.i=32374990;this.B=0}h=Tf.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){return this.l<this.f.length-2?new Tf(this.f,this.l+2,this.Ba):null};h.X=function(){return(this.f.length-this.l)/2};h.N=function(){return rd(this)};h.v=function(a,b){return wd(this,b)};
h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return new Q(null,2,5,R,[this.f[this.l],this.f[this.l+1]],null)};h.sa=function(){return this.l<this.f.length-2?new Tf(this.f,this.l+2,this.Ba):ld};h.S=function(){return this};h.T=function(a,b){return new Tf(this.f,this.l,b)};h.U=function(a,b){return N(b,this)};Tf.prototype[Hb]=function(){return nd(this)};Uf;Vf;function Wf(a,b,c){this.f=a;this.l=b;this.j=c}Wf.prototype.xa=function(){return this.l<this.j};
Wf.prototype.next=function(){var a=new Q(null,2,5,R,[this.f[this.l],this.f[this.l+1]],null);this.l+=2;return a};function u(a,b,c,d){this.u=a;this.j=b;this.f=c;this.s=d;this.i=16647951;this.B=8196}h=u.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.keys=function(){return nd(Uf.a?Uf.a(this):Uf.call(null,this))};h.entries=function(){return Pf(I(this))};h.values=function(){return nd(Vf.a?Vf.a(this):Vf.call(null,this))};h.has=function(a){return ie(this,a)};
h.get=function(a,b){return this.H(null,a,b)};h.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=P(f,0),f=P(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=I(b))ce(b)?(c=Ic(b),b=Jc(b),g=c,d=O(c),c=g):(c=J(b),g=P(c,0),f=P(c,1),a.b?a.b(f,g):a.call(null,f,g),b=L(b),c=null,d=0),e=0;else return null};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){a=Rf(this.f,b);return-1===a?c:this.f[a+1]};h.Ma=function(){return new Wf(this.f,0,2*this.j)};h.R=function(){return this.u};
h.X=function(){return this.j};h.N=function(){var a=this.s;return null!=a?a:this.s=a=td(this)};h.v=function(a,b){if(null!=b&&(b.i&1024||b.Rc)){var c=this.f.length;if(this.j===b.X(null))for(var d=0;;)if(d<c){var e=b.H(null,this.f[d],fe);if(e!==fe)if(Zc.b(this.f[d+1],e))d+=2;else return!1;else return!1}else return!0;else return!1}else return Nf(this,b)};h.gb=function(){return new Sf({},this.f.length,Ib(this.f))};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};
h.Va=function(a,b,c){a=Rf(this.f,b);if(-1===a){if(this.j<Xf){a=this.f;for(var d=a.length,e=Array(d+2),f=0;;)if(f<d)e[f]=a[f],f+=1;else break;e[d]=b;e[d+1]=c;return new u(this.u,this.j+1,e,null)}return kc(Xb(jf.b(Ud,this),b,c),this.u)}if(c===this.f[a+1])return this;b=Ib(this.f);b[a+1]=c;return new u(this.u,this.j,b,null)};h.hc=function(a,b){return-1!==Rf(this.f,b)};h.S=function(){var a=this.f;return 0<=a.length-2?new Tf(a,0,null):null};h.T=function(a,b){return new u(b,this.j,this.f,this.s)};
h.U=function(a,b){if($d(b))return Xb(this,F.b(b,0),F.b(b,1));for(var c=this,d=I(b);;){if(null==d)return c;var e=J(d);if($d(e))c=Xb(c,F.b(e,0),F.b(e,1)),d=L(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};var Se=new u(null,0,[],ud),Xf=8;u.prototype[Hb]=function(){return nd(this)};
Yf;function Sf(a,b,c){this.ib=a;this.bb=b;this.f=c;this.i=258;this.B=56}h=Sf.prototype;h.X=function(){if(y(this.ib))return pe(this.bb);throw Error("count after persistent!");};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){if(y(this.ib))return a=Rf(this.f,b),-1===a?c:this.f[a+1];throw Error("lookup after persistent!");};
h.yb=function(a,b){if(y(this.ib)){if(null!=b?b.i&2048||b.Sc||(b.i?0:C(Zb,b)):C(Zb,b))return Cc(this,ue.a?ue.a(b):ue.call(null,b),ve.a?ve.a(b):ve.call(null,b));for(var c=I(b),d=this;;){var e=J(c);if(y(e))c=L(c),d=Cc(d,ue.a?ue.a(e):ue.call(null,e),ve.a?ve.a(e):ve.call(null,e));else return d}}else throw Error("conj! after persistent!");};h.zb=function(){if(y(this.ib))return this.ib=!1,new u(null,pe(this.bb),this.f,null);throw Error("persistent! called twice");};
h.xb=function(a,b,c){if(y(this.ib)){a=Rf(this.f,b);if(-1===a){if(this.bb+2<=2*Xf)return this.bb+=2,this.f.push(b),this.f.push(c),this;a=Yf.b?Yf.b(this.bb,this.f):Yf.call(null,this.bb,this.f);return Cc(a,b,c)}c!==this.f[a+1]&&(this.f[a+1]=c);return this}throw Error("assoc! after persistent!");};Zf;Sd;function Yf(a,b){for(var c=zc(Ud),d=0;;)if(d<a)c=Cc(c,b[d],b[d+1]),d+=2;else return c}function $f(){this.J=!1}ag;bg;bf;cg;V;M;
function dg(a,b){return a===b?!0:a===b||a instanceof B&&b instanceof B&&a.Ja===b.Ja?!0:Zc.b(a,b)}function eg(a,b,c){a=Ib(a);a[b]=c;return a}function fg(a,b,c,d){a=a.Za(b);a.f[c]=d;return a}gg;function hg(a,b,c,d){this.f=a;this.l=b;this.Kb=c;this.Ha=d}hg.prototype.advance=function(){for(var a=this.f.length;;)if(this.l<a){var b=this.f[this.l],c=this.f[this.l+1];null!=b?b=this.Kb=new Q(null,2,5,R,[b,c],null):null!=c?(b=Pc(c),b=b.xa()?this.Ha=b:!1):b=!1;this.l+=2;if(b)return!0}else return!1};
hg.prototype.xa=function(){var a=null!=this.Kb;return a?a:(a=null!=this.Ha)?a:this.advance()};hg.prototype.next=function(){if(null!=this.Kb){var a=this.Kb;this.Kb=null;return a}if(null!=this.Ha)return a=this.Ha.next(),this.Ha.xa()||(this.Ha=null),a;if(this.advance())return this.next();throw Error("No such element");};hg.prototype.remove=function(){return Error("Unsupported operation")};function ig(a,b,c){this.M=a;this.Y=b;this.f=c}h=ig.prototype;
h.Za=function(a){if(a===this.M)return this;var b=qe(this.Y),c=Array(0>b?4:2*(b+1));ee(this.f,0,c,0,2*b);return new ig(a,this.Y,c)};h.Gb=function(){return ag.a?ag.a(this.f):ag.call(null,this.f)};h.Ta=function(a,b,c,d){var e=1<<(b>>>a&31);if(0===(this.Y&e))return d;var f=qe(this.Y&e-1),e=this.f[2*f],f=this.f[2*f+1];return null==e?f.Ta(a+5,b,c,d):dg(c,e)?f:d};
h.Fa=function(a,b,c,d,e,f){var g=1<<(c>>>b&31),k=qe(this.Y&g-1);if(0===(this.Y&g)){var l=qe(this.Y);if(2*l<this.f.length){a=this.Za(a);b=a.f;f.J=!0;a:for(c=2*(l-k),f=2*k+(c-1),l=2*(k+1)+(c-1);;){if(0===c)break a;b[l]=b[f];--l;--c;--f}b[2*k]=d;b[2*k+1]=e;a.Y|=g;return a}if(16<=l){k=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];k[c>>>b&31]=jg.Fa(a,b+5,c,d,e,f);for(e=d=0;;)if(32>d)0!==
(this.Y>>>d&1)&&(k[d]=null!=this.f[e]?jg.Fa(a,b+5,dd(this.f[e]),this.f[e],this.f[e+1],f):this.f[e+1],e+=2),d+=1;else break;return new gg(a,l+1,k)}b=Array(2*(l+4));ee(this.f,0,b,0,2*k);b[2*k]=d;b[2*k+1]=e;ee(this.f,2*k,b,2*(k+1),2*(l-k));f.J=!0;a=this.Za(a);a.f=b;a.Y|=g;return a}l=this.f[2*k];g=this.f[2*k+1];if(null==l)return l=g.Fa(a,b+5,c,d,e,f),l===g?this:fg(this,a,2*k+1,l);if(dg(d,l))return e===g?this:fg(this,a,2*k+1,e);f.J=!0;f=b+5;d=cg.W?cg.W(a,f,l,g,c,d,e):cg.call(null,a,f,l,g,c,d,e);e=2*k;
k=2*k+1;a=this.Za(a);a.f[e]=null;a.f[k]=d;return a};
h.Ea=function(a,b,c,d,e){var f=1<<(b>>>a&31),g=qe(this.Y&f-1);if(0===(this.Y&f)){var k=qe(this.Y);if(16<=k){g=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];g[b>>>a&31]=jg.Ea(a+5,b,c,d,e);for(d=c=0;;)if(32>c)0!==(this.Y>>>c&1)&&(g[c]=null!=this.f[d]?jg.Ea(a+5,dd(this.f[d]),this.f[d],this.f[d+1],e):this.f[d+1],d+=2),c+=1;else break;return new gg(null,k+1,g)}a=Array(2*(k+1));ee(this.f,
0,a,0,2*g);a[2*g]=c;a[2*g+1]=d;ee(this.f,2*g,a,2*(g+1),2*(k-g));e.J=!0;return new ig(null,this.Y|f,a)}var l=this.f[2*g],f=this.f[2*g+1];if(null==l)return k=f.Ea(a+5,b,c,d,e),k===f?this:new ig(null,this.Y,eg(this.f,2*g+1,k));if(dg(c,l))return d===f?this:new ig(null,this.Y,eg(this.f,2*g+1,d));e.J=!0;e=this.Y;k=this.f;a+=5;a=cg.V?cg.V(a,l,f,b,c,d):cg.call(null,a,l,f,b,c,d);c=2*g;g=2*g+1;d=Ib(k);d[c]=null;d[g]=a;return new ig(null,e,d)};h.Ma=function(){return new hg(this.f,0,null,null)};
var jg=new ig(null,0,[]);function kg(a,b,c){this.f=a;this.l=b;this.Ha=c}kg.prototype.xa=function(){for(var a=this.f.length;;){if(null!=this.Ha&&this.Ha.xa())return!0;if(this.l<a){var b=this.f[this.l];this.l+=1;null!=b&&(this.Ha=Pc(b))}else return!1}};kg.prototype.next=function(){if(this.xa())return this.Ha.next();throw Error("No such element");};kg.prototype.remove=function(){return Error("Unsupported operation")};function gg(a,b,c){this.M=a;this.j=b;this.f=c}h=gg.prototype;
h.Za=function(a){return a===this.M?this:new gg(a,this.j,Ib(this.f))};h.Gb=function(){return bg.a?bg.a(this.f):bg.call(null,this.f)};h.Ta=function(a,b,c,d){var e=this.f[b>>>a&31];return null!=e?e.Ta(a+5,b,c,d):d};h.Fa=function(a,b,c,d,e,f){var g=c>>>b&31,k=this.f[g];if(null==k)return a=fg(this,a,g,jg.Fa(a,b+5,c,d,e,f)),a.j+=1,a;b=k.Fa(a,b+5,c,d,e,f);return b===k?this:fg(this,a,g,b)};
h.Ea=function(a,b,c,d,e){var f=b>>>a&31,g=this.f[f];if(null==g)return new gg(null,this.j+1,eg(this.f,f,jg.Ea(a+5,b,c,d,e)));a=g.Ea(a+5,b,c,d,e);return a===g?this:new gg(null,this.j,eg(this.f,f,a))};h.Ma=function(){return new kg(this.f,0,null)};function lg(a,b,c){b*=2;for(var d=0;;)if(d<b){if(dg(c,a[d]))return d;d+=2}else return-1}function mg(a,b,c,d){this.M=a;this.Sa=b;this.j=c;this.f=d}h=mg.prototype;
h.Za=function(a){if(a===this.M)return this;var b=Array(2*(this.j+1));ee(this.f,0,b,0,2*this.j);return new mg(a,this.Sa,this.j,b)};h.Gb=function(){return ag.a?ag.a(this.f):ag.call(null,this.f)};h.Ta=function(a,b,c,d){a=lg(this.f,this.j,c);return 0>a?d:dg(c,this.f[a])?this.f[a+1]:d};
h.Fa=function(a,b,c,d,e,f){if(c===this.Sa){b=lg(this.f,this.j,d);if(-1===b){if(this.f.length>2*this.j)return b=2*this.j,c=2*this.j+1,a=this.Za(a),a.f[b]=d,a.f[c]=e,f.J=!0,a.j+=1,a;c=this.f.length;b=Array(c+2);ee(this.f,0,b,0,c);b[c]=d;b[c+1]=e;f.J=!0;d=this.j+1;a===this.M?(this.f=b,this.j=d,a=this):a=new mg(this.M,this.Sa,d,b);return a}return this.f[b+1]===e?this:fg(this,a,b+1,e)}return(new ig(a,1<<(this.Sa>>>b&31),[null,this,null,null])).Fa(a,b,c,d,e,f)};
h.Ea=function(a,b,c,d,e){return b===this.Sa?(a=lg(this.f,this.j,c),-1===a?(a=2*this.j,b=Array(a+2),ee(this.f,0,b,0,a),b[a]=c,b[a+1]=d,e.J=!0,new mg(null,this.Sa,this.j+1,b)):Zc.b(this.f[a],d)?this:new mg(null,this.Sa,this.j,eg(this.f,a+1,d))):(new ig(null,1<<(this.Sa>>>a&31),[null,this])).Ea(a,b,c,d,e)};h.Ma=function(){return new hg(this.f,0,null,null)};
var cg=function cg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 6:return cg.V(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);case 7:return cg.W(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5],arguments[6]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
cg.V=function(a,b,c,d,e,f){var g=dd(b);if(g===d)return new mg(null,g,2,[b,c,e,f]);var k=new $f;return jg.Ea(a,g,b,c,k).Ea(a,d,e,f,k)};cg.W=function(a,b,c,d,e,f,g){var k=dd(c);if(k===e)return new mg(null,k,2,[c,d,f,g]);var l=new $f;return jg.Fa(a,b,k,c,d,l).Fa(a,b,e,f,g,l)};cg.A=7;function ng(a,b,c,d,e){this.u=a;this.Ua=b;this.l=c;this.D=d;this.s=e;this.i=32374860;this.B=0}h=ng.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return null==this.D?new Q(null,2,5,R,[this.Ua[this.l],this.Ua[this.l+1]],null):J(this.D)};h.sa=function(){if(null==this.D){var a=this.Ua,b=this.l+2;return ag.c?ag.c(a,b,null):ag.call(null,a,b,null)}var a=this.Ua,b=this.l,c=L(this.D);return ag.c?ag.c(a,b,c):ag.call(null,a,b,c)};h.S=function(){return this};
h.T=function(a,b){return new ng(b,this.Ua,this.l,this.D,this.s)};h.U=function(a,b){return N(b,this)};ng.prototype[Hb]=function(){return nd(this)};var ag=function ag(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return ag.a(arguments[0]);case 3:return ag.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};ag.a=function(a){return ag.c(a,0,null)};
ag.c=function(a,b,c){if(null==c)for(c=a.length;;)if(b<c){if(null!=a[b])return new ng(null,a,b,null,null);var d=a[b+1];if(y(d)&&(d=d.Gb(),y(d)))return new ng(null,a,b+2,d,null);b+=2}else return null;else return new ng(null,a,b,c,null)};ag.A=3;function og(a,b,c,d,e){this.u=a;this.Ua=b;this.l=c;this.D=d;this.s=e;this.i=32374860;this.B=0}h=og.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return J(this.D)};h.sa=function(){var a=this.Ua,b=this.l,c=L(this.D);return bg.m?bg.m(null,a,b,c):bg.call(null,null,a,b,c)};h.S=function(){return this};h.T=function(a,b){return new og(b,this.Ua,this.l,this.D,this.s)};h.U=function(a,b){return N(b,this)};og.prototype[Hb]=function(){return nd(this)};
var bg=function bg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return bg.a(arguments[0]);case 4:return bg.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};bg.a=function(a){return bg.m(null,a,0,null)};
bg.m=function(a,b,c,d){if(null==d)for(d=b.length;;)if(c<d){var e=b[c];if(y(e)&&(e=e.Gb(),y(e)))return new og(a,b,c+1,e,null);c+=1}else return null;else return new og(a,b,c,d,null)};bg.A=4;Zf;function pg(a,b,c){this.za=a;this.Hc=b;this.qc=c}pg.prototype.xa=function(){return this.qc&&this.Hc.xa()};pg.prototype.next=function(){if(this.qc)return this.Hc.next();this.qc=!0;return this.za};pg.prototype.remove=function(){return Error("Unsupported operation")};
function Sd(a,b,c,d,e,f){this.u=a;this.j=b;this.root=c;this.ya=d;this.za=e;this.s=f;this.i=16123663;this.B=8196}h=Sd.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.keys=function(){return nd(Uf.a?Uf.a(this):Uf.call(null,this))};h.entries=function(){return Pf(I(this))};h.values=function(){return nd(Vf.a?Vf.a(this):Vf.call(null,this))};h.has=function(a){return ie(this,a)};h.get=function(a,b){return this.H(null,a,b)};
h.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=P(f,0),f=P(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=I(b))ce(b)?(c=Ic(b),b=Jc(b),g=c,d=O(c),c=g):(c=J(b),g=P(c,0),f=P(c,1),a.b?a.b(f,g):a.call(null,f,g),b=L(b),c=null,d=0),e=0;else return null};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){return null==b?this.ya?this.za:c:null==this.root?c:this.root.Ta(0,dd(b),b,c)};
h.Ma=function(){var a=this.root?Pc(this.root):Oe;return this.ya?new pg(this.za,a,!1):a};h.R=function(){return this.u};h.X=function(){return this.j};h.N=function(){var a=this.s;return null!=a?a:this.s=a=td(this)};h.v=function(a,b){return Nf(this,b)};h.gb=function(){return new Zf({},this.root,this.j,this.ya,this.za)};
h.Va=function(a,b,c){if(null==b)return this.ya&&c===this.za?this:new Sd(this.u,this.ya?this.j:this.j+1,this.root,!0,c,null);a=new $f;b=(null==this.root?jg:this.root).Ea(0,dd(b),b,c,a);return b===this.root?this:new Sd(this.u,a.J?this.j+1:this.j,b,this.ya,this.za,null)};h.hc=function(a,b){return null==b?this.ya:null==this.root?!1:this.root.Ta(0,dd(b),b,fe)!==fe};h.S=function(){if(0<this.j){var a=null!=this.root?this.root.Gb():null;return this.ya?N(new Q(null,2,5,R,[null,this.za],null),a):a}return null};
h.T=function(a,b){return new Sd(b,this.j,this.root,this.ya,this.za,this.s)};h.U=function(a,b){if($d(b))return Xb(this,F.b(b,0),F.b(b,1));for(var c=this,d=I(b);;){if(null==d)return c;var e=J(d);if($d(e))c=Xb(c,F.b(e,0),F.b(e,1)),d=L(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};var Ud=new Sd(null,0,null,!1,null,ud);Sd.prototype[Hb]=function(){return nd(this)};
function Zf(a,b,c,d,e){this.M=a;this.root=b;this.count=c;this.ya=d;this.za=e;this.i=258;this.B=56}function qg(a,b,c){if(a.M){if(null==b)a.za!==c&&(a.za=c),a.ya||(a.count+=1,a.ya=!0);else{var d=new $f;b=(null==a.root?jg:a.root).Fa(a.M,0,dd(b),b,c,d);b!==a.root&&(a.root=b);d.J&&(a.count+=1)}return a}throw Error("assoc! after persistent!");}h=Zf.prototype;h.X=function(){if(this.M)return this.count;throw Error("count after persistent!");};
h.K=function(a,b){return null==b?this.ya?this.za:null:null==this.root?null:this.root.Ta(0,dd(b),b)};h.H=function(a,b,c){return null==b?this.ya?this.za:c:null==this.root?c:this.root.Ta(0,dd(b),b,c)};
h.yb=function(a,b){var c;a:if(this.M)if(null!=b?b.i&2048||b.Sc||(b.i?0:C(Zb,b)):C(Zb,b))c=qg(this,ue.a?ue.a(b):ue.call(null,b),ve.a?ve.a(b):ve.call(null,b));else{c=I(b);for(var d=this;;){var e=J(c);if(y(e))c=L(c),d=qg(d,ue.a?ue.a(e):ue.call(null,e),ve.a?ve.a(e):ve.call(null,e));else{c=d;break a}}}else throw Error("conj! after persistent");return c};h.zb=function(){var a;if(this.M)this.M=null,a=new Sd(null,this.count,this.root,this.ya,this.za,null);else throw Error("persistent! called twice");return a};
h.xb=function(a,b,c){return qg(this,b,c)};rg;sg;function sg(a,b,c,d,e){this.key=a;this.J=b;this.left=c;this.right=d;this.s=e;this.i=32402207;this.B=0}h=sg.prototype;h.replace=function(a,b,c,d){return new sg(a,b,c,d,null)};h.K=function(a,b){return F.c(this,b,null)};h.H=function(a,b,c){return F.c(this,b,c)};h.O=function(a,b){return 0===b?this.key:1===b?this.J:null};h.wa=function(a,b,c){return 0===b?this.key:1===b?this.J:c};
h.Ya=function(a,b,c){return(new Q(null,2,5,R,[this.key,this.J],null)).Ya(null,b,c)};h.R=function(){return null};h.X=function(){return 2};h.tb=function(){return this.key};h.ub=function(){return this.J};h.Wa=function(){return this.J};h.Xa=function(){return new Q(null,1,5,R,[this.key],null)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Bd(this,b)};h.$=function(a,b,c){return Cd(this,b,c)};
h.Va=function(a,b,c){return Td.c(new Q(null,2,5,R,[this.key,this.J],null),b,c)};h.S=function(){return Ob(Ob(ld,this.J),this.key)};h.T=function(a,b){return yd(new Q(null,2,5,R,[this.key,this.J],null),b)};h.U=function(a,b){return new Q(null,3,5,R,[this.key,this.J,b],null)};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};sg.prototype[Hb]=function(){return nd(this)};
function rg(a,b,c,d,e){this.key=a;this.J=b;this.left=c;this.right=d;this.s=e;this.i=32402207;this.B=0}h=rg.prototype;h.replace=function(a,b,c,d){return new rg(a,b,c,d,null)};h.K=function(a,b){return F.c(this,b,null)};h.H=function(a,b,c){return F.c(this,b,c)};h.O=function(a,b){return 0===b?this.key:1===b?this.J:null};h.wa=function(a,b,c){return 0===b?this.key:1===b?this.J:c};h.Ya=function(a,b,c){return(new Q(null,2,5,R,[this.key,this.J],null)).Ya(null,b,c)};h.R=function(){return null};h.X=function(){return 2};
h.tb=function(){return this.key};h.ub=function(){return this.J};h.Wa=function(){return this.J};h.Xa=function(){return new Q(null,1,5,R,[this.key],null)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Bd(this,b)};h.$=function(a,b,c){return Cd(this,b,c)};h.Va=function(a,b,c){return Td.c(new Q(null,2,5,R,[this.key,this.J],null),b,c)};h.S=function(){return Ob(Ob(ld,this.J),this.key)};
h.T=function(a,b){return yd(new Q(null,2,5,R,[this.key,this.J],null),b)};h.U=function(a,b){return new Q(null,3,5,R,[this.key,this.J,b],null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};
h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};rg.prototype[Hb]=function(){return nd(this)};ue;var vd=function vd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return vd.o(0<c.length?new jd(c.slice(0),0):null)};vd.o=function(a){for(var b=I(a),c=zc(Ud);;)if(b){a=L(L(b));var d=J(b),b=Nd(b),c=Cc(c,d,b),b=a}else return Bc(c)};vd.A=0;vd.G=function(a){return vd.o(I(a))};
function tg(a,b){this.F=a;this.Ba=b;this.i=32374988;this.B=0}h=tg.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Tb,this.F)):C(Tb,this.F))?this.F.ra(null):L(this.F);return null==a?null:new tg(a,this.Ba)};h.N=function(){return rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};
h.aa=function(){return this.F.aa(null).tb(null)};h.sa=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Tb,this.F)):C(Tb,this.F))?this.F.ra(null):L(this.F);return null!=a?new tg(a,this.Ba):ld};h.S=function(){return this};h.T=function(a,b){return new tg(this.F,b)};h.U=function(a,b){return N(b,this)};tg.prototype[Hb]=function(){return nd(this)};function Uf(a){return(a=I(a))?new tg(a,null):null}function ue(a){return ac(a)}
function ug(a,b){this.F=a;this.Ba=b;this.i=32374988;this.B=0}h=ug.prototype;h.toString=function(){return Rc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Tb,this.F)):C(Tb,this.F))?this.F.ra(null):L(this.F);return null==a?null:new ug(a,this.Ba)};h.N=function(){return rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};
h.aa=function(){return this.F.aa(null).ub(null)};h.sa=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Tb,this.F)):C(Tb,this.F))?this.F.ra(null):L(this.F);return null!=a?new ug(a,this.Ba):ld};h.S=function(){return this};h.T=function(a,b){return new ug(this.F,b)};h.U=function(a,b){return N(b,this)};ug.prototype[Hb]=function(){return nd(this)};function Vf(a){return(a=I(a))?new ug(a,null):null}function ve(a){return bc(a)}
function vg(a){return y(Ve(a))?Kb.b(function(a,c){return Od.b(y(a)?a:Se,c)},a):null}wg;function xg(a){this.kb=a}xg.prototype.xa=function(){return this.kb.xa()};xg.prototype.next=function(){if(this.kb.xa())return this.kb.next().pa[0];throw Error("No such element");};xg.prototype.remove=function(){return Error("Unsupported operation")};function yg(a,b,c){this.u=a;this.$a=b;this.s=c;this.i=15077647;this.B=8196}h=yg.prototype;h.toString=function(){return Rc(this)};
h.equiv=function(a){return this.v(null,a)};h.keys=function(){return nd(I(this))};h.entries=function(){var a=I(this);return new Qf(I(a))};h.values=function(){return nd(I(this))};h.has=function(a){return ie(this,a)};h.forEach=function(a){for(var b=I(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=P(f,0),f=P(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=I(b))ce(b)?(c=Ic(b),b=Jc(b),g=c,d=O(c),c=g):(c=J(b),g=P(c,0),f=P(c,1),a.b?a.b(f,g):a.call(null,f,g),b=L(b),c=null,d=0),e=0;else return null};
h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){return Wb(this.$a,b)?b:c};h.Ma=function(){return new xg(Pc(this.$a))};h.R=function(){return this.u};h.X=function(){return Mb(this.$a)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=td(this)};h.v=function(a,b){return Xd(b)&&O(this)===O(b)&&Ue(function(a){return function(b){return ie(a,b)}}(this),b)};h.gb=function(){return new wg(zc(this.$a))};h.S=function(){return Uf(this.$a)};h.T=function(a,b){return new yg(b,this.$a,this.s)};
h.U=function(a,b){return new yg(this.u,Td.c(this.$a,b,null),null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};
yg.prototype[Hb]=function(){return nd(this)};function wg(a){this.Pa=a;this.B=136;this.i=259}h=wg.prototype;h.yb=function(a,b){this.Pa=Cc(this.Pa,b,null);return this};h.zb=function(){return new yg(null,Bc(this.Pa),null)};h.X=function(){return O(this.Pa)};h.K=function(a,b){return Vb.c(this,b,null)};h.H=function(a,b,c){return Vb.c(this.Pa,b,fe)===fe?c:b};
h.call=function(){function a(a,b,c){return Vb.c(this.Pa,b,fe)===fe?c:b}function b(a,b){return Vb.c(this.Pa,b,fe)===fe?null:b}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,c,e);case 3:return a.call(this,c,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};h.a=function(a){return Vb.c(this.Pa,a,fe)===fe?null:a};h.b=function(a,b){return Vb.c(this.Pa,a,fe)===fe?b:a};
function te(a){if(null!=a&&(a.B&4096||a.Uc))return a.vb(null);if("string"===typeof a)return a;throw Error([E("Doesn't support name: "),E(a)].join(""));}function zg(a,b){if("string"===typeof b){var c=a.exec(b);return Zc.b(J(c),b)?1===O(c)?J(c):le(c):null}throw new TypeError("re-matches must match against a string.");}
function Df(a,b,c,d,e,f,g){var k=tb;tb=null==tb?null:tb-1;try{if(null!=tb&&0>tb)return wc(a,"#");wc(a,c);if(0===Ab.a(f))I(g)&&wc(a,function(){var a=Ag.a(f);return y(a)?a:"..."}());else{if(I(g)){var l=J(g);b.c?b.c(l,a,f):b.call(null,l,a,f)}for(var m=L(g),n=Ab.a(f)-1;;)if(!m||null!=n&&0===n){I(m)&&0===n&&(wc(a,d),wc(a,function(){var a=Ag.a(f);return y(a)?a:"..."}()));break}else{wc(a,d);var p=J(m);c=a;g=f;b.c?b.c(p,c,g):b.call(null,p,c,g);var q=L(m);c=n-1;m=q;n=c}}return wc(a,e)}finally{tb=k}}
function Bg(a,b){for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f);wc(a,g);f+=1}else if(c=I(c))d=c,ce(d)?(c=Ic(d),e=Jc(d),d=c,g=O(c),c=e,e=g):(g=J(d),wc(a,g),c=L(d),d=null,e=0),f=0;else return null}var Cg={'"':'\\"',"\\":"\\\\","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t"};function Dg(a){return[E('"'),E(a.replace(RegExp('[\\\\"\b\f\n\r\t]',"g"),function(a){return Cg[a]})),E('"')].join("")}Eg;
function Fg(a,b){var c=he(gd.b(a,yb));return c?(c=null!=b?b.i&131072||b.Tc?!0:!1:!1)?null!=Wd(b):c:c}
function Gg(a,b,c){if(null==a)return wc(b,"nil");if(Fg(c,a)){wc(b,"^");var d=Wd(a);Ef.c?Ef.c(d,b,c):Ef.call(null,d,b,c);wc(b," ")}if(a.yc)return a.bd(b);if(null!=a&&(a.i&2147483648||a.P))return a.L(null,b,c);if(!0===a||!1===a||"number"===typeof a)return wc(b,""+E(a));if(null!=a&&a.constructor===Object)return wc(b,"#js "),d=se.b(function(b){return new Q(null,2,5,R,[Ce.a(b),a[b]],null)},de(a)),Eg.m?Eg.m(d,Ef,b,c):Eg.call(null,d,Ef,b,c);if(Db(a))return Df(b,Ef,"#js ["," ","]",c,a);if(ia(a))return y(xb.a(c))?
wc(b,Dg(a)):wc(b,a);if(ka(a)){var e=a.name;c=y(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Function":e;return Bg(b,H(["#object[",c,' "',""+E(a),'"]'],0))}if(a instanceof Date)return c=function(a,b){for(var c=""+E(a);;)if(O(c)<b)c=[E("0"),E(c)].join("");else return c},Bg(b,H(['#inst "',""+E(a.getUTCFullYear()),"-",c(a.getUTCMonth()+1,2),"-",c(a.getUTCDate(),2),"T",c(a.getUTCHours(),2),":",c(a.getUTCMinutes(),2),":",c(a.getUTCSeconds(),2),".",c(a.getUTCMilliseconds(),3),"-",'00:00"'],
0));if(a instanceof RegExp)return Bg(b,H(['#"',a.source,'"'],0));if(null!=a&&(a.i&2147483648||a.P))return xc(a,b,c);if(y(a.constructor.Sb))return Bg(b,H(["#object[",a.constructor.Sb.replace(RegExp("/","g"),"."),"]"],0));e=a.constructor.name;c=y(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Object":e;return Bg(b,H(["#object[",c," ",""+E(a),"]"],0))}function Ef(a,b,c){var d=Hg.a(c);return y(d)?(c=Td.c(c,Ig,Gg),d.c?d.c(a,b,c):d.call(null,a,b,c)):Gg(a,b,c)}
var af=function af(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return af.o(0<c.length?new jd(c.slice(0),0):null)};af.o=function(a){var b=vb();if(null==a||Fb(I(a)))b="";else{var c=E,d=new ob;a:{var e=new Qc(d);Ef(J(a),e,b);a=I(L(a));for(var f=null,g=0,k=0;;)if(k<g){var l=f.O(null,k);wc(e," ");Ef(l,e,b);k+=1}else if(a=I(a))f=a,ce(f)?(a=Ic(f),g=Jc(f),f=a,l=O(a),a=g,g=l):(l=J(f),wc(e," "),Ef(l,e,b),a=L(f),f=null,g=0),k=0;else break a}b=""+c(d)}return b};af.A=0;
af.G=function(a){return af.o(I(a))};function Eg(a,b,c,d){return Df(c,function(a,c,d){var k=ac(a);b.c?b.c(k,c,d):b.call(null,k,c,d);wc(c," ");a=bc(a);return b.c?b.c(a,c,d):b.call(null,a,c,d)},"{",", ","}",d,I(a))}ff.prototype.P=!0;ff.prototype.L=function(a,b,c){wc(b,"#object [cljs.core.Volatile ");Ef(new u(null,1,[Jg,this.state],null),b,c);return wc(b,"]")};jd.prototype.P=!0;jd.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};De.prototype.P=!0;
De.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};ng.prototype.P=!0;ng.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};sg.prototype.P=!0;sg.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};Tf.prototype.P=!0;Tf.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};pd.prototype.P=!0;pd.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};be.prototype.P=!0;be.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};
Ae.prototype.P=!0;Ae.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Hd.prototype.P=!0;Hd.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Sd.prototype.P=!0;Sd.prototype.L=function(a,b,c){return Eg(this,Ef,b,c)};og.prototype.P=!0;og.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};If.prototype.P=!0;If.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};yg.prototype.P=!0;yg.prototype.L=function(a,b,c){return Df(b,Ef,"#{"," ","}",c,this)};
ae.prototype.P=!0;ae.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Ze.prototype.P=!0;Ze.prototype.L=function(a,b,c){wc(b,"#object [cljs.core.Atom ");Ef(new u(null,1,[Jg,this.state],null),b,c);return wc(b,"]")};ug.prototype.P=!0;ug.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};rg.prototype.P=!0;rg.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};Q.prototype.P=!0;Q.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};ye.prototype.P=!0;
ye.prototype.L=function(a,b){return wc(b,"()")};Te.prototype.P=!0;Te.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};u.prototype.P=!0;u.prototype.L=function(a,b,c){return Eg(this,Ef,b,c)};tg.prototype.P=!0;tg.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Id.prototype.P=!0;Id.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Yc.prototype.rb=!0;
Yc.prototype.fb=function(a,b){if(b instanceof Yc)return fd(this,b);throw Error([E("Cannot compare "),E(this),E(" to "),E(b)].join(""));};B.prototype.rb=!0;B.prototype.fb=function(a,b){if(b instanceof B)return Be(this,b);throw Error([E("Cannot compare "),E(this),E(" to "),E(b)].join(""));};If.prototype.rb=!0;If.prototype.fb=function(a,b){if($d(b))return je(this,b);throw Error([E("Cannot compare "),E(this),E(" to "),E(b)].join(""));};Q.prototype.rb=!0;
Q.prototype.fb=function(a,b){if($d(b))return je(this,b);throw Error([E("Cannot compare "),E(this),E(" to "),E(b)].join(""));};function Kg(a){return function(b,c){var d=a.b?a.b(b,c):a.call(null,b,c);return Ad(d)?new zd(d):d}}
function gf(a){return function(b){return function(){function c(a,c){return Kb.c(b,a,c)}function d(b){return a.a?a.a(b):a.call(null,b)}function e(){return a.w?a.w():a.call(null)}var f=null,f=function(a,b){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b)}throw Error("Invalid arity: "+arguments.length);};f.w=e;f.a=d;f.b=c;return f}()}(Kg(a))}Lg;function Mg(){}
var Ng=function Ng(b){if(null!=b&&null!=b.Qc)return b.Qc(b);var c=Ng[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Ng._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEncodeJS.-clj-\x3ejs",b);};Og;function Pg(a){return(null!=a?a.Pc||(a.Ab?0:C(Mg,a)):C(Mg,a))?Ng(a):"string"===typeof a||"number"===typeof a||a instanceof B||a instanceof Yc?Og.a?Og.a(a):Og.call(null,a):af.o(H([a],0))}
var Og=function Og(b){if(null==b)return null;if(null!=b?b.Pc||(b.Ab?0:C(Mg,b)):C(Mg,b))return Ng(b);if(b instanceof B)return te(b);if(b instanceof Yc)return""+E(b);if(Zd(b)){var c={};b=I(b);for(var d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=P(g,0),g=P(g,1);c[Pg(k)]=Og(g);f+=1}else if(b=I(b))ce(b)?(e=Ic(b),b=Jc(b),d=e,e=O(e)):(e=J(b),d=P(e,0),e=P(e,1),c[Pg(d)]=Og(e),b=L(b),d=null,e=0),f=0;else break;return c}if(null==b?0:null!=b?b.i&8||b.sd||(b.i?0:C(Nb,b)):C(Nb,b)){c=[];b=I(se.b(Og,b));d=null;for(f=
e=0;;)if(f<e)k=d.O(null,f),c.push(k),f+=1;else if(b=I(b))d=b,ce(d)?(b=Ic(d),f=Jc(d),d=b,e=O(b),b=f):(b=J(d),c.push(b),b=L(d),d=null,e=0),f=0;else break;return c}return b},Lg=function Lg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Lg.w();case 1:return Lg.a(arguments[0]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};Lg.w=function(){return Lg.a(1)};Lg.a=function(a){return Math.random()*a};Lg.A=1;var Qg=null;
function Rg(){if(null==Qg){var a=new u(null,3,[Sg,Se,Tg,Se,Ug,Se],null);Qg=V.a?V.a(a):V.call(null,a)}return Qg}function Vg(a,b,c){var d=Zc.b(b,c);if(!d&&!(d=ie(Ug.a(a).call(null,b),c))&&(d=$d(c))&&(d=$d(b)))if(d=O(c)===O(b))for(var d=!0,e=0;;)if(d&&e!==O(c))d=Vg(a,b.a?b.a(e):b.call(null,e),c.a?c.a(e):c.call(null,e)),e+=1;else return d;else return d;else return d}function Wg(a){var b;b=Rg();b=M.a?M.a(b):M.call(null,b);a=gd.b(Sg.a(b),a);return I(a)?a:null}
function Xg(a,b,c,d){ef.b(a,function(){return M.a?M.a(b):M.call(null,b)});ef.b(c,function(){return M.a?M.a(d):M.call(null,d)})}var Yg=function Yg(b,c,d){var e=(M.a?M.a(d):M.call(null,d)).call(null,b),e=y(y(e)?e.a?e.a(c):e.call(null,c):e)?!0:null;if(y(e))return e;e=function(){for(var e=Wg(c);;)if(0<O(e))Yg(b,J(e),d),e=kd(e);else return null}();if(y(e))return e;e=function(){for(var e=Wg(b);;)if(0<O(e))Yg(J(e),c,d),e=kd(e);else return null}();return y(e)?e:!1};
function Zg(a,b,c){c=Yg(a,b,c);if(y(c))a=c;else{c=Vg;var d;d=Rg();d=M.a?M.a(d):M.call(null,d);a=c(d,a,b)}return a}
var $g=function $g(b,c,d,e,f,g,k){var l=Kb.c(function(e,g){var k=P(g,0);P(g,1);if(Vg(M.a?M.a(d):M.call(null,d),c,k)){var l;l=(l=null==e)?l:Zg(k,J(e),f);l=y(l)?g:e;if(!y(Zg(J(l),k,f)))throw Error([E("Multiple methods in multimethod '"),E(b),E("' match dispatch value: "),E(c),E(" -\x3e "),E(k),E(" and "),E(J(l)),E(", and neither is preferred")].join(""));return l}return e},null,M.a?M.a(e):M.call(null,e));if(y(l)){if(Zc.b(M.a?M.a(k):M.call(null,k),M.a?M.a(d):M.call(null,d)))return ef.m(g,Td,c,Nd(l)),
Nd(l);Xg(g,e,k,d);return $g(b,c,d,e,f,g,k)}return null};function X(a,b){throw Error([E("No method in multimethod '"),E(a),E("' for dispatch value: "),E(b)].join(""));}function ah(a,b,c,d,e,f,g,k){this.name=a;this.h=b;this.gd=c;this.Fb=d;this.lb=e;this.nd=f;this.Jb=g;this.pb=k;this.i=4194305;this.B=4352}h=ah.prototype;
h.call=function(){function a(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K,T){a=this;var pa=Jb.o(a.h,b,c,d,e,H([f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K,T],0)),Ah=Y(this,pa);y(Ah)||X(a.name,pa);return Jb.o(Ah,b,c,d,e,H([f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K,T],0))}function b(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K){a=this;var T=a.h.ma?a.h.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K),pa=Y(this,T);y(pa)||X(a.name,T);return pa.ma?pa.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,v,
w,x,A,z,G,K):pa.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G,K)}function c(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G){a=this;var K=a.h.la?a.h.la(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G),T=Y(this,K);y(T)||X(a.name,K);return T.la?T.la(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G):T.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z,G)}function d(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z){a=this;var G=a.h.ka?a.h.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z):a.h.call(null,
b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z),K=Y(this,G);y(K)||X(a.name,G);return K.ka?K.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z):K.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,z)}function e(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A){a=this;var z=a.h.ja?a.h.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A),G=Y(this,z);y(G)||X(a.name,z);return G.ja?G.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):G.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A)}function f(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,
x){a=this;var A=a.h.ia?a.h.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x),z=Y(this,A);y(z)||X(a.name,A);return z.ia?z.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):z.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x)}function g(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w){a=this;var x=a.h.ha?a.h.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w),A=Y(this,x);y(A)||X(a.name,x);return A.ha?A.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,v,w):A.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w)}
function k(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v){a=this;var w=a.h.ga?a.h.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,v):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v),x=Y(this,w);y(x)||X(a.name,w);return x.ga?x.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,v):x.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,v)}function l(a,b,c,d,e,f,g,k,l,m,n,p,q,r){a=this;var v=a.h.fa?a.h.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r),w=Y(this,v);y(w)||X(a.name,v);return w.fa?w.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):w.call(null,b,c,d,e,f,g,k,l,m,n,p,
q,r)}function m(a,b,c,d,e,f,g,k,l,m,n,p,q){a=this;var r=a.h.ea?a.h.ea(b,c,d,e,f,g,k,l,m,n,p,q):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q),v=Y(this,r);y(v)||X(a.name,r);return v.ea?v.ea(b,c,d,e,f,g,k,l,m,n,p,q):v.call(null,b,c,d,e,f,g,k,l,m,n,p,q)}function n(a,b,c,d,e,f,g,k,l,m,n,p){a=this;var q=a.h.da?a.h.da(b,c,d,e,f,g,k,l,m,n,p):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p),r=Y(this,q);y(r)||X(a.name,q);return r.da?r.da(b,c,d,e,f,g,k,l,m,n,p):r.call(null,b,c,d,e,f,g,k,l,m,n,p)}function p(a,b,c,d,e,f,g,k,l,m,
n){a=this;var p=a.h.ca?a.h.ca(b,c,d,e,f,g,k,l,m,n):a.h.call(null,b,c,d,e,f,g,k,l,m,n),q=Y(this,p);y(q)||X(a.name,p);return q.ca?q.ca(b,c,d,e,f,g,k,l,m,n):q.call(null,b,c,d,e,f,g,k,l,m,n)}function q(a,b,c,d,e,f,g,k,l,m){a=this;var n=a.h.oa?a.h.oa(b,c,d,e,f,g,k,l,m):a.h.call(null,b,c,d,e,f,g,k,l,m),p=Y(this,n);y(p)||X(a.name,n);return p.oa?p.oa(b,c,d,e,f,g,k,l,m):p.call(null,b,c,d,e,f,g,k,l,m)}function r(a,b,c,d,e,f,g,k,l){a=this;var m=a.h.na?a.h.na(b,c,d,e,f,g,k,l):a.h.call(null,b,c,d,e,f,g,k,l),n=
Y(this,m);y(n)||X(a.name,m);return n.na?n.na(b,c,d,e,f,g,k,l):n.call(null,b,c,d,e,f,g,k,l)}function v(a,b,c,d,e,f,g,k){a=this;var l=a.h.W?a.h.W(b,c,d,e,f,g,k):a.h.call(null,b,c,d,e,f,g,k),m=Y(this,l);y(m)||X(a.name,l);return m.W?m.W(b,c,d,e,f,g,k):m.call(null,b,c,d,e,f,g,k)}function w(a,b,c,d,e,f,g){a=this;var k=a.h.V?a.h.V(b,c,d,e,f,g):a.h.call(null,b,c,d,e,f,g),l=Y(this,k);y(l)||X(a.name,k);return l.V?l.V(b,c,d,e,f,g):l.call(null,b,c,d,e,f,g)}function x(a,b,c,d,e,f){a=this;var g=a.h.C?a.h.C(b,c,
d,e,f):a.h.call(null,b,c,d,e,f),k=Y(this,g);y(k)||X(a.name,g);return k.C?k.C(b,c,d,e,f):k.call(null,b,c,d,e,f)}function A(a,b,c,d,e){a=this;var f=a.h.m?a.h.m(b,c,d,e):a.h.call(null,b,c,d,e),g=Y(this,f);y(g)||X(a.name,f);return g.m?g.m(b,c,d,e):g.call(null,b,c,d,e)}function G(a,b,c,d){a=this;var e=a.h.c?a.h.c(b,c,d):a.h.call(null,b,c,d),f=Y(this,e);y(f)||X(a.name,e);return f.c?f.c(b,c,d):f.call(null,b,c,d)}function K(a,b,c){a=this;var d=a.h.b?a.h.b(b,c):a.h.call(null,b,c),e=Y(this,d);y(e)||X(a.name,
d);return e.b?e.b(b,c):e.call(null,b,c)}function T(a,b){a=this;var c=a.h.a?a.h.a(b):a.h.call(null,b),d=Y(this,c);y(d)||X(a.name,c);return d.a?d.a(b):d.call(null,b)}function pa(a){a=this;var b=a.h.w?a.h.w():a.h.call(null),c=Y(this,b);y(c)||X(a.name,b);return c.w?c.w():c.call(null)}var z=null,z=function(z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb,Eb,$b,Gc,xd,tf){switch(arguments.length){case 1:return pa.call(this,z);case 2:return T.call(this,z,S);case 3:return K.call(this,z,S,U);case 4:return G.call(this,
z,S,U,W);case 5:return A.call(this,z,S,U,W,aa);case 6:return x.call(this,z,S,U,W,aa,da);case 7:return w.call(this,z,S,U,W,aa,da,ga);case 8:return v.call(this,z,S,U,W,aa,da,ga,ja);case 9:return r.call(this,z,S,U,W,aa,da,ga,ja,ma);case 10:return q.call(this,z,S,U,W,aa,da,ga,ja,ma,oa);case 11:return p.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua);case 12:return n.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za);case 13:return m.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia);case 14:return l.call(this,z,S,U,W,aa,
da,ga,ja,ma,oa,ua,za,Ia,Ma);case 15:return k.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc);case 16:return g.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya);case 17:return f.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb);case 18:return e.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb,Eb);case 19:return d.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb,Eb,$b);case 20:return c.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb,Eb,$b,Gc);case 21:return b.call(this,
z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb,Eb,$b,Gc,xd);case 22:return a.call(this,z,S,U,W,aa,da,ga,ja,ma,oa,ua,za,Ia,Ma,oc,Ya,nb,Eb,$b,Gc,xd,tf)}throw Error("Invalid arity: "+arguments.length);};z.a=pa;z.b=T;z.c=K;z.m=G;z.C=A;z.V=x;z.W=w;z.na=v;z.oa=r;z.ca=q;z.da=p;z.ea=n;z.fa=m;z.ga=l;z.ha=k;z.ia=g;z.ja=f;z.ka=e;z.la=d;z.ma=c;z.lc=b;z.sb=a;return z}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Ib(b)))};
h.w=function(){var a=this.h.w?this.h.w():this.h.call(null),b=Y(this,a);y(b)||X(this.name,a);return b.w?b.w():b.call(null)};h.a=function(a){var b=this.h.a?this.h.a(a):this.h.call(null,a),c=Y(this,b);y(c)||X(this.name,b);return c.a?c.a(a):c.call(null,a)};h.b=function(a,b){var c=this.h.b?this.h.b(a,b):this.h.call(null,a,b),d=Y(this,c);y(d)||X(this.name,c);return d.b?d.b(a,b):d.call(null,a,b)};
h.c=function(a,b,c){var d=this.h.c?this.h.c(a,b,c):this.h.call(null,a,b,c),e=Y(this,d);y(e)||X(this.name,d);return e.c?e.c(a,b,c):e.call(null,a,b,c)};h.m=function(a,b,c,d){var e=this.h.m?this.h.m(a,b,c,d):this.h.call(null,a,b,c,d),f=Y(this,e);y(f)||X(this.name,e);return f.m?f.m(a,b,c,d):f.call(null,a,b,c,d)};h.C=function(a,b,c,d,e){var f=this.h.C?this.h.C(a,b,c,d,e):this.h.call(null,a,b,c,d,e),g=Y(this,f);y(g)||X(this.name,f);return g.C?g.C(a,b,c,d,e):g.call(null,a,b,c,d,e)};
h.V=function(a,b,c,d,e,f){var g=this.h.V?this.h.V(a,b,c,d,e,f):this.h.call(null,a,b,c,d,e,f),k=Y(this,g);y(k)||X(this.name,g);return k.V?k.V(a,b,c,d,e,f):k.call(null,a,b,c,d,e,f)};h.W=function(a,b,c,d,e,f,g){var k=this.h.W?this.h.W(a,b,c,d,e,f,g):this.h.call(null,a,b,c,d,e,f,g),l=Y(this,k);y(l)||X(this.name,k);return l.W?l.W(a,b,c,d,e,f,g):l.call(null,a,b,c,d,e,f,g)};
h.na=function(a,b,c,d,e,f,g,k){var l=this.h.na?this.h.na(a,b,c,d,e,f,g,k):this.h.call(null,a,b,c,d,e,f,g,k),m=Y(this,l);y(m)||X(this.name,l);return m.na?m.na(a,b,c,d,e,f,g,k):m.call(null,a,b,c,d,e,f,g,k)};h.oa=function(a,b,c,d,e,f,g,k,l){var m=this.h.oa?this.h.oa(a,b,c,d,e,f,g,k,l):this.h.call(null,a,b,c,d,e,f,g,k,l),n=Y(this,m);y(n)||X(this.name,m);return n.oa?n.oa(a,b,c,d,e,f,g,k,l):n.call(null,a,b,c,d,e,f,g,k,l)};
h.ca=function(a,b,c,d,e,f,g,k,l,m){var n=this.h.ca?this.h.ca(a,b,c,d,e,f,g,k,l,m):this.h.call(null,a,b,c,d,e,f,g,k,l,m),p=Y(this,n);y(p)||X(this.name,n);return p.ca?p.ca(a,b,c,d,e,f,g,k,l,m):p.call(null,a,b,c,d,e,f,g,k,l,m)};h.da=function(a,b,c,d,e,f,g,k,l,m,n){var p=this.h.da?this.h.da(a,b,c,d,e,f,g,k,l,m,n):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n),q=Y(this,p);y(q)||X(this.name,p);return q.da?q.da(a,b,c,d,e,f,g,k,l,m,n):q.call(null,a,b,c,d,e,f,g,k,l,m,n)};
h.ea=function(a,b,c,d,e,f,g,k,l,m,n,p){var q=this.h.ea?this.h.ea(a,b,c,d,e,f,g,k,l,m,n,p):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p),r=Y(this,q);y(r)||X(this.name,q);return r.ea?r.ea(a,b,c,d,e,f,g,k,l,m,n,p):r.call(null,a,b,c,d,e,f,g,k,l,m,n,p)};h.fa=function(a,b,c,d,e,f,g,k,l,m,n,p,q){var r=this.h.fa?this.h.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q),v=Y(this,r);y(v)||X(this.name,r);return v.fa?v.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):v.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q)};
h.ga=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r){var v=this.h.ga?this.h.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r),w=Y(this,v);y(w)||X(this.name,v);return w.ga?w.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):w.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r)};
h.ha=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v){var w=this.h.ha?this.h.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v),x=Y(this,w);y(x)||X(this.name,w);return x.ha?x.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v):x.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v)};
h.ia=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w){var x=this.h.ia?this.h.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w),A=Y(this,x);y(A)||X(this.name,x);return A.ia?A.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w):A.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w)};
h.ja=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x){var A=this.h.ja?this.h.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x),G=Y(this,A);y(G)||X(this.name,A);return G.ja?G.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x):G.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x)};
h.ka=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A){var G=this.h.ka?this.h.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A),K=Y(this,G);y(K)||X(this.name,G);return K.ka?K.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A):K.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A)};
h.la=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G){var K=this.h.la?this.h.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G),T=Y(this,K);y(T)||X(this.name,K);return T.la?T.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G):T.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G)};
h.ma=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K){var T=this.h.ma?this.h.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K),pa=Y(this,T);y(pa)||X(this.name,T);return pa.ma?pa.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K):pa.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K)};
h.lc=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T){var pa=Jb.o(this.h,a,b,c,d,H([e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T],0)),z=Y(this,pa);y(z)||X(this.name,pa);return Jb.o(z,a,b,c,d,H([e,f,g,k,l,m,n,p,q,r,v,w,x,A,G,K,T],0))};function bh(a,b){var c=ch;ef.m(c.lb,Td,a,b);Xg(c.Jb,c.lb,c.pb,c.Fb)}
function Y(a,b){Zc.b(M.a?M.a(a.pb):M.call(null,a.pb),M.a?M.a(a.Fb):M.call(null,a.Fb))||Xg(a.Jb,a.lb,a.pb,a.Fb);var c=(M.a?M.a(a.Jb):M.call(null,a.Jb)).call(null,b);if(y(c))return c;c=$g(a.name,b,a.Fb,a.lb,a.nd,a.Jb,a.pb);return y(c)?c:(M.a?M.a(a.lb):M.call(null,a.lb)).call(null,a.gd)}h.vb=function(){return Lc(this.name)};h.wb=function(){return Mc(this.name)};h.N=function(){return la(this)};var dh=new B(null,"orders","orders",-1032870176),eh=new B(null,"from-date","from-date",1469949792),fh=new B(null,"date","date",-1463434462),gh=new B(null,"remove","remove",-131428414),yb=new B(null,"meta","meta",1499536964),hh=new B(null,"table","table",-564943036),ih=new B(null,"color","color",1011675173),zb=new B(null,"dup","dup",556298533),jh=new B(null,"couriers","couriers",-1702205146),df=new Yc(null,"new-value","new-value",-1567397401,null),$e=new B(null,"validator","validator",-1966190681),
kh=new B(null,"to-date","to-date",500848648),lh=new B(null,"default","default",-1987822328),mh=new B(null,"name","name",1843675177),nh=new B(null,"td","td",1479933353),oh=new B(null,"value","value",305978217),ph=new B(null,"tr","tr",-1424774646),qh=new B(null,"timeout-interval","timeout-interval",-749158902),rh=new B(null,"accepted","accepted",-1953464374),sh=new B(null,"coll","coll",1647737163),Jg=new B(null,"val","val",128701612),th=new B(null,"type","type",1174270348),cf=new Yc(null,"validate",
"validate",1439230700,null),Ig=new B(null,"fallback-impl","fallback-impl",-1501286995),wb=new B(null,"flush-on-newline","flush-on-newline",-151457939),Tg=new B(null,"descendants","descendants",1824886031),uh=new B(null,"title","title",636505583),Ug=new B(null,"ancestors","ancestors",-776045424),vh=new B(null,"style","style",-496642736),wh=new B(null,"cancelled","cancelled",488726224),xh=new B(null,"div","div",1057191632),xb=new B(null,"readably","readably",1129599760),Ag=new B(null,"more-marker",
"more-marker",-14717935),yh=new B(null,"google-map","google-map",1960730035),zh=new B(null,"status","status",-1997798413),Ab=new B(null,"print-length","print-length",1931866356),Bh=new B(null,"unassigned","unassigned",-1438879244),Ch=new B(null,"id","id",-1388402092),Dh=new B(null,"class","class",-2030961996),Eh=new B(null,"checked","checked",-50955819),Sg=new B(null,"parents","parents",-2027538891),Fh=new B(null,"strokeColor","strokeColor",-1017463338),Gh=new B(null,"lat","lat",-580793929),Hh=new B(null,
"br","br",934104792),Ih=new B(null,"complete","complete",-500388775),Jh=new B(null,"options","options",99638489),Kh=new B(null,"input","input",556931961),Lh=new B(null,"xhtml","xhtml",1912943770),Re=new Yc(null,"quote","quote",1377916282,null),Qe=new B(null,"arglists","arglists",1661989754),Mh=new B(null,"couriers-control","couriers-control",1386141787),Pe=new Yc(null,"nil-iter","nil-iter",1101030523,null),Nh=new B(null,"add","add",235287739),Oh=new B(null,"hierarchy","hierarchy",-1053470341),Hg=
new B(null,"alt-impl","alt-impl",670969595),Ph=new B(null,"fillColor","fillColor",-176906116),Qh=new B(null,"selected?","selected?",-742502788),Rh=new B(null,"lng","lng",1667213918),Sh=new B(null,"servicing","servicing",-1502937442),Th=new B(null,"text","text",-1790561697),Uh=new B(null,"enroute","enroute",-1681821057),Vh=new B(null,"attr","attr",-604132353);function Wh(a){var b=/\./;if("string"===typeof b)return a.replace(new RegExp(Ba(b),"g")," ");if(b instanceof RegExp)return a.replace(new RegExp(b.source,"g")," ");throw[E("Invalid match arg: "),E(b)].join("");};var Xh={};function Yh(a,b){var c=Xh[b];if(!c){var d=Da(b),c=d;void 0===a.style[d]&&(d=(fb?"Webkit":eb?"Moz":cb?"ms":bb?"O":null)+Fa(d),void 0!==a.style[d]&&(c=d));Xh[b]=c}return c};function Zh(){}function $h(){}var ai=function ai(b){if(null!=b&&null!=b.dd)return b.dd(b);var c=ai[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=ai._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("bindable.-value",b);},bi=function bi(b,c){if(null!=b&&null!=b.cd)return b.cd(b,c);var d=bi[t(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=bi._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("bindable.-on-change",b);};
function ci(a){return null!=a?a.zd?!0:a.Ab?!1:C($h,a):C($h,a)}function di(a){return null!=a?a.Ad?!0:a.Ab?!1:C(Zh,a):C(Zh,a)}function ei(a,b){return bi(a,b)};var fi=new u(null,2,[Lh,"http://www.w3.org/1999/xhtml",new B(null,"svg","svg",856789142),"http://www.w3.org/2000/svg"],null);gi;hi;ii;V.a?V.a(0):V.call(null,0);var ji=V.a?V.a(Pd):V.call(null,Pd);function ki(a,b){ef.c(ji,Od,new Q(null,2,5,R,[a,b],null))}function li(){}
var mi=function mi(b){if(null!=b&&null!=b.fd)return b.fd(b);var c=mi[t(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=mi._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("Element.-elem",b);},ni=function ni(b,c){for(var d=I(c),e=null,f=0,g=0;;)if(g<f){var k=e.O(null,g),l;if(null!=k?k.ed||(k.Ab?0:C(li,k)):C(li,k))l=mi(k);else if(null==k)l=null;else{if(Zd(k))throw"Maps cannot be used as content";"string"===typeof k?l=document.createTextNode(String(k)):$d(k)?l=gi.a?gi.a(k):gi.call(null,
k):ge(k)?l=ni(b,k):y(di(k))?(ki(sh,k),l=ni(b,new Q(null,1,5,R,[ai(k)],null))):y(ci(k))?(ki(Th,k),l=ni(b,new Q(null,1,5,R,[ai(k)],null))):l=y(k.nodeName)?k:y(k.get)?k.get(0):function(){var b=""+E(k);return document.createTextNode(String(b))}()}y(l)&&b.appendChild(l);g+=1}else if(d=I(d)){if(ce(d))f=Ic(d),d=Jc(d),e=f,f=O(f);else{k=J(d);if(null!=k?k.ed||(k.Ab?0:C(li,k)):C(li,k))e=mi(k);else if(null==k)e=null;else{if(Zd(k))throw"Maps cannot be used as content";"string"===typeof k?e=document.createTextNode(String(k)):
$d(k)?e=gi.a?gi.a(k):gi.call(null,k):ge(k)?e=ni(b,k):y(di(k))?(ki(sh,k),e=ni(b,new Q(null,1,5,R,[ai(k)],null))):y(ci(k))?(ki(Th,k),e=ni(b,new Q(null,1,5,R,[ai(k)],null))):e=y(k.nodeName)?k:y(k.get)?k.get(0):function(){var b=""+E(k);return document.createTextNode(String(b))}()}y(e)&&b.appendChild(e);d=L(d);e=null;f=0}g=0}else return null};
if("undefined"===typeof ch)var ch=function(){var a=V.a?V.a(Se):V.call(null,Se),b=V.a?V.a(Se):V.call(null,Se),c=V.a?V.a(Se):V.call(null,Se),d=V.a?V.a(Se):V.call(null,Se),e=gd.c(Se,Oh,Rg());return new ah(hd.b("crate.compiler","dom-binding"),function(){return function(a){return a}}(a,b,c,d,e),lh,e,a,b,c,d)}();bh(Th,function(a,b,c){return ei(b,function(a){for(var b;b=c.firstChild;)c.removeChild(b);return ni(c,new Q(null,1,5,R,[a],null))})});
bh(Vh,function(a,b,c){a=P(b,0);var d=P(b,1);return ei(d,function(a,b){return function(a){return hi.c?hi.c(c,b,a):hi.call(null,c,b,a)}}(b,a,d))});bh(vh,function(a,b,c){a=P(b,0);var d=P(b,1);return ei(d,function(a,b){return function(a){return y(b)?ii.c?ii.c(c,b,a):ii.call(null,c,b,a):ii.b?ii.b(c,a):ii.call(null,c,a)}}(b,a,d))});
bh(sh,function(a,b,c){return ei(b,function(a,e,f){if(y(Zc.b?Zc.b(Nh,a):Zc.call(null,Nh,a)))return a=b.md.call(null,Nh),y(a)?e=a.c?a.c(c,e,f):a.call(null,c,e,f):(c.appendChild(e),e=void 0),e;if(y(Zc.b?Zc.b(gh,a):Zc.call(null,gh,a)))return f=b.md.call(null,gh),y(f)?f.a?f.a(e):f.call(null,e):e&&e.parentNode?e.parentNode.removeChild(e):null;throw Error([E("No matching clause: "),E(a)].join(""));})});
var ii=function ii(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ii.b(arguments[0],arguments[1]);case 3:return ii.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
ii.b=function(a,b){if("string"===typeof b)a.setAttribute("style",b);else if(Zd(b))for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=P(g,0),g=P(g,1);ii.c(a,k,g);f+=1}else if(c=I(c))ce(c)?(e=Ic(c),c=Jc(c),d=e,e=O(e)):(e=J(c),d=P(e,0),e=P(e,1),ii.c(a,d,e),c=L(c),d=null,e=0),f=0;else break;else y(ci(b))&&(ki(vh,new Q(null,2,5,R,[null,b],null)),ii.b(a,ai(b)));return a};
ii.c=function(a,b,c){y(ci(c))&&(ki(vh,new Q(null,2,5,R,[b,c],null)),c=ai(c));b=te(b);if(ia(b)){var d=Yh(a,b);d&&(a.style[d]=c)}else for(d in b){c=a;var e=b[d],f=Yh(c,d);f&&(c.style[f]=e)}};ii.A=3;var hi=function hi(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return hi.b(arguments[0],arguments[1]);case 3:return hi.c(arguments[0],arguments[1],arguments[2]);default:throw Error([E("Invalid arity: "),E(c.length)].join(""));}};
hi.b=function(a,b){if(y(a)){if(Zd(b)){for(var c=I(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=P(g,0),g=P(g,1);hi.c(a,k,g);f+=1}else if(c=I(c))ce(c)?(e=Ic(c),c=Jc(c),d=e,e=O(e)):(e=J(c),d=P(e,0),e=P(e,1),hi.c(a,d,e),c=L(c),d=null,e=0),f=0;else break;return a}return a.getAttribute(te(b))}return null};hi.c=function(a,b,c){Zc.b(b,vh)?ii.b(a,c):(y(ci(c))&&(ki(Vh,new Q(null,2,5,R,[b,c],null)),c=ai(c)),a.setAttribute(te(b),c));return a};hi.A=3;var oi=/([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?/;
function pi(a){return jf.b(Se,se.b(function(a){var c=P(a,0);a=P(a,1);return!0===a?new Q(null,2,5,R,[c,te(c)],null):new Q(null,2,5,R,[c,a],null)},hf(We.b(he,Nd),a)))}
function qi(a){var b=P(a,0),c=re(a);if(!(b instanceof B||b instanceof Yc||"string"===typeof b))throw[E(b),E(" is not a valid tag name.")].join("");var d=zg(oi,te(b)),e=P(d,0),f=P(d,1),g=P(d,2),k=P(d,3),l=function(){var a,b=/:/;a:for(b="/(?:)/"===""+E(b)?Od.b(le(N("",se.b(E,I(f)))),""):le((""+E(f)).split(b));;)if(""===(null==b?null:dc(b)))b=null==b?null:ec(b);else break a;a=b;b=P(a,0);a=P(a,1);var c;c=Ce.a(b);c=fi.a?fi.a(c):fi.call(null,c);return y(a)?new Q(null,2,5,R,[y(c)?c:b,a],null):new Q(null,
2,5,R,[Lh.a(fi),b],null)}(),m=P(l,0),n=P(l,1);a=jf.b(Se,hf(function(){return function(a){return null!=Nd(a)}}(d,e,f,g,k,l,m,n,a,b,c),new u(null,2,[Ch,y(g)?g:null,Dh,y(k)?Wh(k):null],null)));b=J(c);return Zd(b)?new Q(null,4,5,R,[m,n,vg(H([a,pi(b)],0)),L(c)],null):new Q(null,4,5,R,[m,n,a,c],null)}var ri=y(document.createElementNS)?function(a,b){return document.createElementNS(a,b)}:function(a,b){return document.createElement(b)};
function gi(a){var b=ji;ji=V.a?V.a(Pd):V.call(null,Pd);try{var c=qi(a),d=P(c,0),e=P(c,1),f=P(c,2),g=P(c,3),k=ri.b?ri.b(d,e):ri.call(null,d,e);hi.b(k,f);ni(k,g);a:{var l=M.a?M.a(ji):M.call(null,ji),m=I(l);a=null;for(d=c=0;;)if(d<c){var n=a.O(null,d),p=P(n,0),q=P(n,1);ch.c?ch.c(p,q,k):ch.call(null,p,q,k);d+=1}else{var r=I(m);if(r){e=r;if(ce(e)){var v=Ic(e),w=Jc(e),e=v,x=O(v),m=w;a=e;c=x}else{var A=J(e),p=P(A,0),q=P(A,1);ch.c?ch.c(p,q,k):ch.call(null,p,q,k);m=L(e);a=null;c=0}d=0}else break a}}return k}finally{ji=
b}};V.a?V.a(0):V.call(null,0);function si(a){var b=document,c=b.createElement("DIV");cb?(c.innerHTML="\x3cbr\x3e"+a,c.removeChild(c.firstChild)):c.innerHTML=a;if(1==c.childNodes.length)c=c.removeChild(c.firstChild);else{for(a=b.createDocumentFragment();c.firstChild;)a.appendChild(c.firstChild);c=a}return c}function ti(a){a=se.b(gi,a);return y(Nd(a))?a:J(a)};[].push(function(){});function ui(){0!=vi&&(wi[la(this)]=this);this.Cb=this.Cb;this.Xb=this.Xb}var vi=0,wi={};ui.prototype.Cb=!1;ui.prototype.Bb=function(){if(this.Xb)for(;this.Xb.length;)this.Xb.shift()()};var xi=!cb||9<=mb,yi=cb&&!kb("9");!fb||kb("528");eb&&kb("1.9b")||cb&&kb("8")||bb&&kb("9.5")||fb&&kb("528");eb&&!kb("8")||cb&&kb("9");function zi(a,b){this.type=a;this.currentTarget=this.target=b;this.defaultPrevented=this.cb=!1;this.Gc=!0}zi.prototype.stopPropagation=function(){this.cb=!0};zi.prototype.preventDefault=function(){this.defaultPrevented=!0;this.Gc=!1};function Ai(a){Ai[" "](a);return a}Ai[" "]=fa;function Bi(a,b){zi.call(this,a?a.type:"");this.relatedTarget=this.currentTarget=this.target=null;this.charCode=this.keyCode=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.Db=this.state=null;if(a){var c=this.type=a.type;this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;if(d){if(eb){var e;a:{try{Ai(d.nodeName);e=!0;break a}catch(f){}e=!1}e||(d=null)}}else"mouseover"==
c?d=a.fromElement:"mouseout"==c&&(d=a.toElement);this.relatedTarget=d;this.offsetX=fb||void 0!==a.offsetX?a.offsetX:a.layerX;this.offsetY=fb||void 0!==a.offsetY?a.offsetY:a.layerY;this.clientX=void 0!==a.clientX?a.clientX:a.pageX;this.clientY=void 0!==a.clientY?a.clientY:a.pageY;this.screenX=a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;
this.metaKey=a.metaKey;this.state=a.state;this.Db=a;a.defaultPrevented&&this.preventDefault()}}wa(Bi,zi);Bi.prototype.stopPropagation=function(){Bi.$b.stopPropagation.call(this);this.Db.stopPropagation?this.Db.stopPropagation():this.Db.cancelBubble=!0};Bi.prototype.preventDefault=function(){Bi.$b.preventDefault.call(this);var a=this.Db;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,yi)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var Ci="closure_listenable_"+(1E6*Math.random()|0),Di=0;function Ei(a,b,c,d,e){this.listener=a;this.Zb=null;this.src=b;this.type=c;this.qb=!!d;this.Ub=e;this.key=++Di;this.mb=this.Nb=!1}function Fi(a){a.mb=!0;a.listener=null;a.Zb=null;a.src=null;a.Ub=null};function Gi(a){this.src=a;this.va={};this.Lb=0}Gi.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.va[f];a||(a=this.va[f]=[],this.Lb++);var g=Hi(a,b,d,e);-1<g?(b=a[g],c||(b.Nb=!1)):(b=new Ei(b,this.src,f,!!d,e),b.Nb=c,a.push(b));return b};Gi.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.va))return!1;var e=this.va[a];b=Hi(e,b,c,d);return-1<b?(Fi(e[b]),Ja.splice.call(e,b,1),0==e.length&&(delete this.va[a],this.Lb--),!0):!1};
function Ii(a,b){var c=b.type;c in a.va&&Pa(a.va[c],b)&&(Fi(b),0==a.va[c].length&&(delete a.va[c],a.Lb--))}Gi.prototype.nc=function(a,b,c,d){a=this.va[a.toString()];var e=-1;a&&(e=Hi(a,b,c,d));return-1<e?a[e]:null};Gi.prototype.hasListener=function(a,b){var c=void 0!==a,d=c?a.toString():"",e=void 0!==b;return Va(this.va,function(a){for(var g=0;g<a.length;++g)if(!(c&&a[g].type!=d||e&&a[g].qb!=b))return!0;return!1})};
function Hi(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.mb&&f.listener==b&&f.qb==!!c&&f.Ub==d)return e}return-1};var Ji="closure_lm_"+(1E6*Math.random()|0),Ki={},Li=0;
function Mi(a,b,c,d,e){if("array"==t(b))for(var f=0;f<b.length;f++)Mi(a,b[f],c,d,e);else if(c=Ni(c),a&&a[Ci])a.Da.add(String(b),c,!1,d,e);else{if(!b)throw Error("Invalid event type");var f=!!d,g=Oi(a);g||(a[Ji]=g=new Gi(a));c=g.add(b,c,!1,d,e);if(!c.Zb){d=Pi();c.Zb=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,f);else if(a.attachEvent)a.attachEvent(Qi(b.toString()),d);else throw Error("addEventListener and attachEvent are unavailable.");Li++}}}
function Pi(){var a=Ri,b=xi?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b}function Si(a,b,c,d,e){if("array"==t(b))for(var f=0;f<b.length;f++)Si(a,b[f],c,d,e);else c=Ni(c),a&&a[Ci]?a.Da.remove(String(b),c,d,e):a&&(a=Oi(a))&&(b=a.nc(b,c,!!d,e))&&Ti(b)}
function Ti(a){if("number"!=typeof a&&a&&!a.mb){var b=a.src;if(b&&b[Ci])Ii(b.Da,a);else{var c=a.type,d=a.Zb;b.removeEventListener?b.removeEventListener(c,d,a.qb):b.detachEvent&&b.detachEvent(Qi(c),d);Li--;(c=Oi(b))?(Ii(c,a),0==c.Lb&&(c.src=null,b[Ji]=null)):Fi(a)}}}function Qi(a){return a in Ki?Ki[a]:Ki[a]="on"+a}function Ui(a,b,c,d){var e=!0;if(a=Oi(a))if(b=a.va[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.qb==c&&!f.mb&&(f=Vi(f,d),e=e&&!1!==f)}return e}
function Vi(a,b){var c=a.listener,d=a.Ub||a.src;a.Nb&&Ti(a);return c.call(d,b)}
function Ri(a,b){if(a.mb)return!0;if(!xi){var c;if(!(c=b))a:{c=["window","event"];for(var d=ca,e;e=c.shift();)if(null!=d[e])d=d[e];else{c=null;break a}c=d}e=c;c=new Bi(e,this);d=!0;if(!(0>e.keyCode||void 0!=e.returnValue)){a:{var f=!1;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(l){f=!0}if(f||void 0==e.returnValue)e.returnValue=!0}e=[];for(f=c.currentTarget;f;f=f.parentNode)e.push(f);for(var f=a.type,g=e.length-1;!c.cb&&0<=g;g--){c.currentTarget=e[g];var k=Ui(e[g],f,!0,c),d=d&&k}for(g=0;!c.cb&&
g<e.length;g++)c.currentTarget=e[g],k=Ui(e[g],f,!1,c),d=d&&k}return d}return Vi(a,new Bi(b,this))}function Oi(a){a=a[Ji];return a instanceof Gi?a:null}var Wi="__closure_events_fn_"+(1E9*Math.random()>>>0);function Ni(a){if(ka(a))return a;a[Wi]||(a[Wi]=function(b){return a.handleEvent(b)});return a[Wi]};function Xi(){ui.call(this);this.Da=new Gi(this);this.Lc=this;this.pc=null}wa(Xi,ui);Xi.prototype[Ci]=!0;h=Xi.prototype;h.addEventListener=function(a,b,c,d){Mi(this,a,b,c,d)};h.removeEventListener=function(a,b,c,d){Si(this,a,b,c,d)};
h.dispatchEvent=function(a){var b,c=this.pc;if(c)for(b=[];c;c=c.pc)b.push(c);var c=this.Lc,d=a.type||a;if(ia(a))a=new zi(a,c);else if(a instanceof zi)a.target=a.target||c;else{var e=a;a=new zi(d,c);$a(a,e)}var e=!0,f;if(b)for(var g=b.length-1;!a.cb&&0<=g;g--)f=a.currentTarget=b[g],e=Yi(f,d,!0,a)&&e;a.cb||(f=a.currentTarget=c,e=Yi(f,d,!0,a)&&e,a.cb||(e=Yi(f,d,!1,a)&&e));if(b)for(g=0;!a.cb&&g<b.length;g++)f=a.currentTarget=b[g],e=Yi(f,d,!1,a)&&e;return e};
h.Bb=function(){Xi.$b.Bb.call(this);if(this.Da){var a=this.Da,b=0,c;for(c in a.va){for(var d=a.va[c],e=0;e<d.length;e++)++b,Fi(d[e]);delete a.va[c];a.Lb--}}this.pc=null};function Yi(a,b,c,d){b=a.Da.va[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var g=b[f];if(g&&!g.mb&&g.qb==c){var k=g.listener,l=g.Ub||g.src;g.Nb&&Ii(a.Da,g);e=!1!==k.call(l,d)&&e}}return e&&0!=d.Gc}h.nc=function(a,b,c,d){return this.Da.nc(String(a),b,c,d)};
h.hasListener=function(a,b){return this.Da.hasListener(void 0!==a?String(a):void 0,b)};function Zi(a,b,c){if(ka(a))c&&(a=ta(a,c));else if(a&&"function"==typeof a.handleEvent)a=ta(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<b?-1:ca.setTimeout(a,b||0)};function $i(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};function aj(a){if("function"==typeof a.Tb)return a.Tb();if(ia(a))return a.split("");if(ha(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return Wa(a)}
function bj(a,b){if("function"==typeof a.forEach)a.forEach(b,void 0);else if(ha(a)||ia(a))La(a,b,void 0);else{var c;if("function"==typeof a.Eb)c=a.Eb();else if("function"!=typeof a.Tb)if(ha(a)||ia(a)){c=[];for(var d=a.length,e=0;e<d;e++)c.push(e)}else c=Xa(a);else c=void 0;for(var d=aj(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a)}};function cj(a,b){this.Oa={};this.ta=[];this.Na=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)}h=cj.prototype;h.Tb=function(){dj(this);for(var a=[],b=0;b<this.ta.length;b++)a.push(this.Oa[this.ta[b]]);return a};h.Eb=function(){dj(this);return this.ta.concat()};
h.equals=function(a,b){if(this===a)return!0;if(this.Na!=a.Na)return!1;var c=b||ej;dj(this);for(var d,e=0;d=this.ta[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};function ej(a,b){return a===b}h.isEmpty=function(){return 0==this.Na};h.clear=function(){this.Oa={};this.Na=this.ta.length=0};h.remove=function(a){return Object.prototype.hasOwnProperty.call(this.Oa,a)?(delete this.Oa[a],this.Na--,this.ta.length>2*this.Na&&dj(this),!0):!1};
function dj(a){if(a.Na!=a.ta.length){for(var b=0,c=0;b<a.ta.length;){var d=a.ta[b];Object.prototype.hasOwnProperty.call(a.Oa,d)&&(a.ta[c++]=d);b++}a.ta.length=c}if(a.Na!=a.ta.length){for(var e={},c=b=0;b<a.ta.length;)d=a.ta[b],Object.prototype.hasOwnProperty.call(e,d)||(a.ta[c++]=d,e[d]=1),b++;a.ta.length=c}}h.get=function(a,b){return Object.prototype.hasOwnProperty.call(this.Oa,a)?this.Oa[a]:b};
h.set=function(a,b){Object.prototype.hasOwnProperty.call(this.Oa,a)||(this.Na++,this.ta.push(a));this.Oa[a]=b};h.addAll=function(a){var b;a instanceof cj?(b=a.Eb(),a=a.Tb()):(b=Xa(a),a=Wa(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};h.forEach=function(a,b){for(var c=this.Eb(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};h.clone=function(){return new cj(this)};function fj(a,b,c,d,e){this.reset(a,b,c,d,e)}fj.prototype.zc=null;var gj=0;fj.prototype.reset=function(a,b,c,d,e){"number"==typeof e||gj++;d||va();this.Ib=a;this.jd=b;delete this.zc};fj.prototype.Ic=function(a){this.Ib=a};function hj(a){this.Dc=a;this.Ac=this.gc=this.Ib=this.Yb=null}function ij(a,b){this.name=a;this.value=b}ij.prototype.toString=function(){return this.name};var jj=new ij("SEVERE",1E3),kj=new ij("INFO",800),lj=new ij("CONFIG",700),mj=new ij("FINE",500);h=hj.prototype;h.getName=function(){return this.Dc};h.getParent=function(){return this.Yb};h.Ic=function(a){this.Ib=a};function nj(a){if(a.Ib)return a.Ib;if(a.Yb)return nj(a.Yb);Ha("Root logger has no level set.");return null}
h.log=function(a,b,c){if(a.value>=nj(this).value)for(ka(b)&&(b=b()),a=new fj(a,String(b),this.Dc),c&&(a.zc=c),c="log:"+a.jd,ca.console&&(ca.console.timeStamp?ca.console.timeStamp(c):ca.console.markTimeline&&ca.console.markTimeline(c)),ca.msWriteProfilerMark&&ca.msWriteProfilerMark(c),c=this;c;){b=c;var d=a;if(b.Ac)for(var e=0,f=void 0;f=b.Ac[e];e++)f(d);c=c.getParent()}};h.info=function(a,b){this.log(kj,a,b)};var oj={},pj=null;
function qj(a){pj||(pj=new hj(""),oj[""]=pj,pj.Ic(lj));var b;if(!(b=oj[a])){b=new hj(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=qj(a.substr(0,c));c.gc||(c.gc={});c.gc[d]=b;b.Yb=c;oj[a]=b}return b};function rj(a,b){a&&a.log(mj,b,void 0)};function sj(){}sj.prototype.rc=null;function tj(a){var b;(b=a.rc)||(b={},uj(a)&&(b[0]=!0,b[1]=!0),b=a.rc=b);return b};var vj;function wj(){}wa(wj,sj);function xj(a){return(a=uj(a))?new ActiveXObject(a):new XMLHttpRequest}function uj(a){if(!a.Bc&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.Bc=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.Bc}vj=new wj;var yj=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function zj(a){if(Aj){Aj=!1;var b=ca.location;if(b){var c=b.href;if(c&&(c=(c=zj(c)[3]||null)?decodeURI(c):c)&&c!=b.hostname)throw Aj=!0,Error();}}return a.match(yj)}var Aj=fb;function Bj(a){Xi.call(this);this.headers=new cj;this.dc=a||null;this.Qa=!1;this.cc=this.I=null;this.Hb=this.Cc=this.Wb="";this.ab=this.oc=this.Vb=this.mc=!1;this.ob=0;this.ac=null;this.Fc=Cj;this.bc=this.qd=!1}wa(Bj,Xi);var Cj="",Dj=Bj.prototype,Ej=qj("goog.net.XhrIo");Dj.Ga=Ej;var Fj=/^https?$/i,Gj=["POST","PUT"],Hj=[];h=Bj.prototype;h.Mc=function(){if(!this.Cb&&(this.Cb=!0,this.Bb(),0!=vi)){var a=la(this);delete wi[a]}Pa(Hj,this)};
h.send=function(a,b,c,d){if(this.I)throw Error("[goog.net.XhrIo] Object is active with another request\x3d"+this.Wb+"; newUri\x3d"+a);b=b?b.toUpperCase():"GET";this.Wb=a;this.Hb="";this.Cc=b;this.mc=!1;this.Qa=!0;this.I=this.dc?xj(this.dc):xj(vj);this.cc=this.dc?tj(this.dc):tj(vj);this.I.onreadystatechange=ta(this.Ec,this);try{rj(this.Ga,Ij(this,"Opening Xhr")),this.oc=!0,this.I.open(b,String(a),!0),this.oc=!1}catch(f){rj(this.Ga,Ij(this,"Error opening Xhr: "+f.message));Jj(this,f);return}a=c||"";
var e=this.headers.clone();d&&bj(d,function(a,b){e.set(b,a)});d=Na(e.Eb());c=ca.FormData&&a instanceof ca.FormData;!(0<=Ka(Gj,b))||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset\x3dutf-8");e.forEach(function(a,b){this.I.setRequestHeader(b,a)},this);this.Fc&&(this.I.responseType=this.Fc);"withCredentials"in this.I&&(this.I.withCredentials=this.qd);try{Kj(this),0<this.ob&&(this.bc=Lj(this.I),rj(this.Ga,Ij(this,"Will abort after "+this.ob+"ms if incomplete, xhr2 "+this.bc)),this.bc?
(this.I.timeout=this.ob,this.I.ontimeout=ta(this.Jc,this)):this.ac=Zi(this.Jc,this.ob,this)),rj(this.Ga,Ij(this,"Sending request")),this.Vb=!0,this.I.send(a),this.Vb=!1}catch(f){rj(this.Ga,Ij(this,"Send error: "+f.message)),Jj(this,f)}};function Lj(a){return cb&&kb(9)&&"number"==typeof a.timeout&&void 0!==a.ontimeout}function Oa(a){return"content-type"==a.toLowerCase()}
h.Jc=function(){"undefined"!=typeof ba&&this.I&&(this.Hb="Timed out after "+this.ob+"ms, aborting",rj(this.Ga,Ij(this,this.Hb)),this.dispatchEvent("timeout"),this.abort(8))};function Jj(a,b){a.Qa=!1;a.I&&(a.ab=!0,a.I.abort(),a.ab=!1);a.Hb=b;Mj(a);Nj(a)}function Mj(a){a.mc||(a.mc=!0,a.dispatchEvent("complete"),a.dispatchEvent("error"))}
h.abort=function(){this.I&&this.Qa&&(rj(this.Ga,Ij(this,"Aborting")),this.Qa=!1,this.ab=!0,this.I.abort(),this.ab=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Nj(this))};h.Bb=function(){this.I&&(this.Qa&&(this.Qa=!1,this.ab=!0,this.I.abort(),this.ab=!1),Nj(this,!0));Bj.$b.Bb.call(this)};h.Ec=function(){this.Cb||(this.oc||this.Vb||this.ab?Oj(this):this.ld())};h.ld=function(){Oj(this)};
function Oj(a){if(a.Qa&&"undefined"!=typeof ba)if(a.cc[1]&&4==Pj(a)&&2==a.getStatus())rj(a.Ga,Ij(a,"Local request error detected and ignored"));else if(a.Vb&&4==Pj(a))Zi(a.Ec,0,a);else if(a.dispatchEvent("readystatechange"),4==Pj(a)){rj(a.Ga,Ij(a,"Request complete"));a.Qa=!1;try{if(Qj(a))a.dispatchEvent("complete"),a.dispatchEvent("success");else{var b;try{b=2<Pj(a)?a.I.statusText:""}catch(c){rj(a.Ga,"Can not get status: "+c.message),b=""}a.Hb=b+" ["+a.getStatus()+"]";Mj(a)}}finally{Nj(a)}}}
function Nj(a,b){if(a.I){Kj(a);var c=a.I,d=a.cc[0]?fa:null;a.I=null;a.cc=null;b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(e){(c=a.Ga)&&c.log(jj,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}}function Kj(a){a.I&&a.bc&&(a.I.ontimeout=null);"number"==typeof a.ac&&(ca.clearTimeout(a.ac),a.ac=null)}
function Qj(a){var b=a.getStatus(),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=!0;break a;default:c=!1}if(!c){if(b=0===b)a=zj(String(a.Wb))[1]||null,!a&&ca.self&&ca.self.location&&(a=ca.self.location.protocol,a=a.substr(0,a.length-1)),b=!Fj.test(a?a.toLowerCase():"");c=b}return c}function Pj(a){return a.I?a.I.readyState:0}h.getStatus=function(){try{return 2<Pj(this)?this.I.status:-1}catch(a){return-1}};
h.getResponseHeader=function(a){return this.I&&4==Pj(this)?this.I.getResponseHeader(a):void 0};h.getAllResponseHeaders=function(){return this.I&&4==Pj(this)?this.I.getAllResponseHeaders():""};function Ij(a,b){return b+" ["+a.Cc+" "+a.Wb+" "+a.getStatus()+"]"};var Z,Rj=new u(null,8,[qh,5E3,dh,[],jh,null,Mh,new u(null,2,[Qh,!0,ih,"#8E44AD"],null),yh,null,eh,"2015-05-01",kh,moment().format("YYYY-MM-DD"),zh,new u(null,6,[Bh,new u(null,2,[ih,"#ff0000",Qh,!0],null),rh,new u(null,2,[ih,"#808080",Qh,!0],null),Uh,new u(null,2,[ih,"#ffdd00",Qh,!0],null),Sh,new u(null,2,[ih,"#0000ff",Qh,!0],null),Ih,new u(null,2,[ih,"#00ff00",Qh,!0],null),wh,new u(null,2,[ih,"#000000",Qh,!0],null)],null)],null);Z=V.a?V.a(Rj):V.call(null,Rj);
function Sj(a,b){var c=b.target;return y(Qj(c))?(c=c.I?$i(c.I.responseText):void 0,a.a?a.a(c):a.call(null,c)):console.log([E("xhrio-wrapper error:"),E(c.lastError_)].join(""))}function Tj(a,b){return J(hf(function(a){return Zc.b(b,a.id)},a))}var Uj=document.getElementById("base-url").getAttribute("value");function Vj(a){var b=yh.a(M.a?M.a(Z):M.call(null,Z)),c=lf(M.a?M.a(Z):M.call(null,Z),new Q(null,2,5,R,[Mh,ih],null));return Wj(a,b,c,function(){return ld})}
function Wj(a,b,c,d){b=new google.maps.Circle({strokeColor:c,strokeOpacity:1,strokeWeight:1,fillColor:c,fillOpacity:1,map:b,center:{lat:a.lat,lng:a.lng},radius:200});b.addListener("click",d);return a.circle=b}function Xj(a,b){var c=Math.pow(2,21-a);return b.circle.setRadius(21<=a?1:10>=a?200:10<a&&21>a?.3046942494*c:null)}
function Yj(a,b){var c=b.circle.center,d=c.lat(),c=c.lng(),e=yh.a(M.a?M.a(a):M.call(null,a)).getZoom(),f=b.label;f.set("position",new google.maps.LatLng(d+-1*Math.pow(10,-1*e/4.2),c));return f.draw()}ea("dashboard_cljs.core.get_map_info",function(){return console.log([E("Map-Zoom:"),E(yh.a(M.a?M.a(Z):M.call(null,Z)).getZoom()),E(" "),E("Font-size:"),E(J(jh.a(M.a?M.a(Z):M.call(null,Z))).label.fontSize),E(" "),E("label-lat:"),E(J(jh.a(M.a?M.a(Z):M.call(null,Z))).label.position.lat())].join(""))});
function Zj(a,b){a["info-window"]=new google.maps.InfoWindow({position:{lat:a.lat,lng:a.lng},content:b.outerHTML})}
function ak(a){return ti(H([new Q(null,2,5,R,[hh,se.b(function(a){var c=ac(a);a=bc(a);return ti(H([new Q(null,3,5,R,[ph,new Q(null,3,5,R,[nh,new u(null,1,[Dh,"info-window-td"],null),c],null),new Q(null,2,5,R,[nh,a],null)],null)],0))},new u(null,9,["Status",a.status,"Courier",a.courier_name,"Customer",a.customer_name,"Phone",a.customer_phone_number,"Address",si([E(a.address_street),E("\x3c/br\x3e"),E(a.address_city),E(","),E(a.address_state),E(" "),E(a.address_zip)].join("")),"Plate #",a.license_plate,
"Gallons",a.gallons,"Octane",a.gas_type,"Total Price",a.total_price],null))],null)],0))}function bk(a,b){var c=Date.parse(eh.a(M.a?M.a(a):M.call(null,a))),d=b.timestamp_created,e=Date.parse(kh.a(M.a?M.a(a):M.call(null,a)))+864E5,f=b.status,f=lf(M.a?M.a(a):M.call(null,a),new Q(null,3,5,R,[zh,Ce.a(f),Qh],null));return(c=c<=d&&d<=e)?f:c}
function ck(a,b,c,d){return kf(function(b){if(y(d.a?d.a(b):d.call(null,b))){var f=yh.a(M.a?M.a(a):M.call(null,a));b=null!=b[c]?b[c].setMap(f):null}else b=null!=b[c]?b[c].setMap(null):null;return b},b)}function dk(a,b){var c=b.active,d=b.on_duty,e=b.connected,f=lf(M.a?M.a(a):M.call(null,a),new Q(null,2,5,R,[Mh,Qh],null));return y(e)?y(c)?y(d)?f:d:c:e}function ek(){function a(a){return ck(Z,jh.a(M.a?M.a(Z):M.call(null,Z)),a,Xe(dk,Z))}a("circle");return a("label")}
function fk(a){var b=a.circle;return y(a.busy)?b.setOptions(Og(new u(null,1,[Jh,new u(null,1,[Fh,"#ff0000"],null)],null))):b.setOptions(Og(new u(null,1,[Jh,new u(null,1,[Fh,"#00ff00"],null)],null)))}function gk(a){for(var b=[],c=arguments.length,d=0;;)if(d<c)b.push(arguments[d]),d+=1;else break;hk(arguments[0],arguments[1],arguments[2],3<b.length?new jd(b.slice(3),0):null)}
function hk(a,b,c,d){d=P(d,0);a=[E(Uj),E(a)].join("");var e=Og(new u(null,1,["Content-Type","application/json"],null)),e=H([b,e,d],0);b=P(e,0);d=P(e,1);var e=P(e,2),f=new Bj;Hj.push(f);c&&f.Da.add("complete",c,!1,void 0,void 0);f.Da.add("ready",f.Mc,!0,void 0,void 0);e&&(f.ob=Math.max(0,e));f.send(a,"POST",b,d);return f}
function ik(){gk("couriers",Se,Xe(Sj,function(a){a=a.couriers;ef.m(Z,Td,jh,a);kf(function(){return function(a){return Vj(a)}}(a),jh.a(M.a?M.a(Z):M.call(null,Z)));kf(function(){return function(a){var c=yh.a(M.a?M.a(Z):M.call(null,Z)),d=a.name,c=new MapLabel({map:c,position:new google.maps.LatLng(a.lat+-1*Math.pow(10,-1*c.getZoom()/4.2),a.lng),text:d,fontSize:12,align:"center"});return a.label=c}}(a),jh.a(M.a?M.a(Z):M.call(null,Z)));kf(fk,jh.a(M.a?M.a(Z):M.call(null,Z)));return ek()}))}
function jk(){hk("couriers",Se,Xe(Sj,function(a){a=a.couriers;kf(function(){return function(a){var c=Tj(jh.a(M.a?M.a(Z):M.call(null,Z)),a.id),d=c.circle,e=a.lat,f=a.lng,g=a.active,k=a.on_duty,l=a.connected;a=a.busy;var m=Og(new u(null,2,[Gh,e,Rh,f],null));c.lat=e;c.lng=f;c.active=g;c.on_duty=k;c.connected=l;c.busy=a;d.setCenter(m);Yj(Z,c);return fk(c)}}(a),a);return ek()}),H([qh.a(M.a?M.a(Z):M.call(null,Z))],0))}
function kk(a){for(var b=[],c=arguments.length,d=0;;)if(d<c)b.push(arguments[d]),d+=1;else break;lk(arguments[0],arguments[1],2<b.length?new jd(b.slice(2),0):null)}function lk(a,b,c){c=P(c,0);a=Og(new u(null,1,[fh,a],null));a=JSON.stringify(a);return hk("orders-since-date",a,b,H([c],0))}function mk(a){var b=a.total_price,b=[E("$"),E((b/100).toFixed(2))].join("");a.total_price=b}
function nk(a,b){var c=b.status,d=b.courier_name,e=lf(M.a?M.a(a):M.call(null,a),new Q(null,3,5,R,[zh,Ce.a(c),ih],null)),f=Tj(dh.a(M.a?M.a(a):M.call(null,a)),b.id);if(null==f)return Wj(b,yh.a(M.a?M.a(a):M.call(null,a)),lf(M.a?M.a(a):M.call(null,a),new Q(null,3,5,R,[zh,Ce.a(b.status),ih],null)),function(){return function(){return b["info-window"].open(yh.a(M.a?M.a(a):M.call(null,a)))}}(c,d,e,f)),b.timestamp_created=Date.parse(b.timestamp_created),mk(b),Zj(b,ak(b)),dh.a(M.a?M.a(a):M.call(null,a)).push(b);
f.status=c;f.courier_name=d;f["info-window"].setContent(ak(f).outerHTML);lf(M.a?M.a(a):M.call(null,a),new Q(null,2,5,R,[zh,Ce.a(c)],null));return f.circle.setOptions(Og(new u(null,1,[Jh,new u(null,2,[Ph,e,Fh,e],null)],null)))}function ok(a,b){kk(b,Xe(Sj,function(b){b=b.orders;return null!=b?(kf(Xe(nk,a),b),ck(a,dh.a(M.a?M.a(a):M.call(null,a)),"circle",Xe(bk,a))):null}))}
function pk(){return lk(moment().format("YYYY-MM-DD"),Xe(Sj,function(a){a=a.orders;return null!=a?(kf(Xe(nk,Z),a),ck(Z,dh.a(M.a?M.a(Z):M.call(null,Z)),"circle",Xe(bk,Z))):null}),H([qh.a(M.a?M.a(Z):M.call(null,Z))],0))}function qk(a){for(var b=[],c=arguments.length,d=0;;)if(d<c)b.push(arguments[d]),d+=1;else break;return rk(arguments[0],1<b.length?new jd(b.slice(1),0):null)}
function rk(a,b){var c=P(b,0);return ti(H([new Q(null,2,5,R,[xh,new u(null,1,[vh,[E("height: 10px;"),E(" width: 10px;"),E(" display: inline-block;"),E(" float: right;"),E(" border-radius: 10px;"),E(" margin-top: 7px;"),E(" margin-left: 5px;"),E(" background-color: "),E(a),E("; "),E(null!=c?[E(" border: 1px solid "),E(c),E(";")].join(""):null)].join("")],null)],null)],0))}
function sk(a){var b=ti(H([new Q(null,2,5,R,[Kh,new u(null,5,[th,"checkbox",mh,"orders",oh,"orders",Dh,"orders-checkbox",Eh,!0],null)],null)],0)),c=ti(H([new Q(null,5,5,R,[xh,new u(null,1,[Dh,"setCenterText"],null),b,a,qk(lf(M.a?M.a(Z):M.call(null,Z),new Q(null,3,5,R,[zh,Ce.a(a),ih],null)))],null)],0));b.addEventListener("click",function(b){return function(){y(b.checked)?ef.m(Z,mf,new Q(null,3,5,R,[zh,Ce.a(a),Qh],null),!0):ef.m(Z,mf,new Q(null,3,5,R,[zh,Ce.a(a),Qh],null),!1);return ck(Z,dh.a(M.a?
M.a(Z):M.call(null,Z)),"circle",Xe(bk,Z))}}(b,c));return c}function tk(){return ti(H([new Q(null,2,5,R,[xh,new Q(null,3,5,R,[xh,new u(null,2,[Dh,"setCenterUI",uh,"Select order status"],null),se.b(function(a){return sk(a)},Xc("unassigned","accepted","enroute","servicing","complete","cancelled"))],null)],null)],0))}
function uk(){function a(a){return ti(H([new Q(null,2,5,R,[Kh,new u(null,4,[th,"text",mh,"orders-date",Dh,"date-picker",oh,a],null)],null)],0))}var b=function(){return function(a,b){return new Pikaday({field:a,format:"YYYY-MM-DD",onSelect:b})}}(a),c=a(eh.a(M.a?M.a(Z):M.call(null,Z))),d=b(c,function(a,b,c){return function(){ef.m(Z,Td,eh,c.value);return ck(Z,dh.a(M.a?M.a(Z):M.call(null,Z)),"circle",Xe(bk,Z))}}(a,b,c)),e=a(kh.a(M.a?M.a(Z):M.call(null,Z)));b(e,function(a,b,c,d,e){return function(){ef.m(Z,
Td,kh,e.value);return ck(Z,dh.a(M.a?M.a(Z):M.call(null,Z)),"circle",Xe(bk,Z))}}(a,b,c,d,e));return ti(H([new Q(null,2,5,R,[xh,new Q(null,3,5,R,[xh,new u(null,2,[Dh,"setCenterUI",uh,"Click to change dates"],null),new Q(null,9,5,R,[xh,new u(null,1,[Dh,"setCenterText"],null),"Orders",new Q(null,1,5,R,[Hh],null),"From: ",c,new Q(null,1,5,R,[Hh],null),"To:   ",e],null)],null)],null)],0))}
function vk(){var a=ti(H([new Q(null,2,5,R,[Kh,new u(null,5,[th,"checkbox",mh,"couriers",oh,"couriers",Dh,"couriers-checkbox",Eh,!0],null)],null)],0)),b=ti(H([new Q(null,10,5,R,[xh,new u(null,1,[Dh,"setCenterText"],null),a,"Couriers",new Q(null,1,5,R,[Hh],null),"Busy",rk(lf(M.a?M.a(Z):M.call(null,Z),new Q(null,2,5,R,[Mh,ih],null)),H(["#ff0000"],0)),new Q(null,1,5,R,[Hh],null),"Not Busy",rk(lf(M.a?M.a(Z):M.call(null,Z),new Q(null,2,5,R,[Mh,ih],null)),H(["#00ff00"],0))],null)],0));a.addEventListener("click",
function(a){return function(){y(a.checked)?ef.m(Z,mf,new Q(null,2,5,R,[Mh,Qh],null),!0):ef.m(Z,mf,new Q(null,2,5,R,[Mh,Qh],null),!1);return ck(Z,jh.a(M.a?M.a(Z):M.call(null,Z)),"circle",Xe(dk,Z))}}(a,b));return ti(H([new Q(null,2,5,R,[xh,new Q(null,3,5,R,[xh,new u(null,2,[Dh,"setCenterUI",uh,"Select couriers"],null),b],null)],null)],0))}function wk(a,b){a.controls[google.maps.ControlPosition.LEFT_TOP].push(b)}
var xk=function xk(b,c){return setTimeout(function(){b.w?b.w():b.call(null);return xk(b,c)},c)};
ea("dashboard_cljs.core.init_map_orders",function(){ef.m(Z,Td,yh,new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:12}));yh.a(M.a?M.a(Z):M.call(null,Z)).addListener("zoom_changed",function(){return kf(Xe(Xj,yh.a(M.a?M.a(Z):M.call(null,Z)).getZoom()),dh.a(M.a?M.a(Z):M.call(null,Z)))});wk(yh.a(M.a?M.a(Z):M.call(null,Z)),ti(H([new Q(null,3,5,R,[xh,uk(),tk()],null)],0)));ok(Z,"");return xk(function(){return pk()},6E5)});
ea("dashboard_cljs.core.init_map_couriers",function(){ef.m(Z,Td,yh,new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:12}));yh.a(M.a?M.a(Z):M.call(null,Z)).addListener("zoom_changed",function(){kf(Xe(Xj,yh.a(M.a?M.a(Z):M.call(null,Z)).getZoom()),dh.a(M.a?M.a(Z):M.call(null,Z)));kf(Xe(Xj,yh.a(M.a?M.a(Z):M.call(null,Z)).getZoom()),jh.a(M.a?M.a(Z):M.call(null,Z)));return kf(Xe(Yj,Z),jh.a(M.a?M.a(Z):M.call(null,Z)))});wk(yh.a(M.a?M.a(Z):M.call(null,Z)),ti(H([new Q(null,
3,5,R,[xh,tk(),ti(H([new Q(null,2,5,R,[xh,vk()],null)],0))],null)],0)));ok(Z,moment().format("YYYY-MM-DD"));ik();return xk(function(){jk();return pk()},qh.a(M.a?M.a(Z):M.call(null,Z)))});