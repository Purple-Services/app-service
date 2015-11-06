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

var h,aa=aa||{},ca=this;function da(a,b){var c=a.split("."),d=ca;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)c.length||void 0===b?d=d[e]?d[e]:d[e]={}:d[e]=b}function ea(){}
function u(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function fa(a){var b=u(a);return"array"==b||"object"==b&&"number"==typeof a.length}function ha(a){return"string"==typeof a}function ia(a){return"function"==u(a)}function ka(a){return a[la]||(a[la]=++na)}var la="closure_uid_"+(1E9*Math.random()>>>0),na=0;function qa(a,b,c){return a.call.apply(a.bind,arguments)}
function ra(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function sa(a,b,c){sa=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?qa:ra;return sa.apply(null,arguments)}var ta=Date.now||function(){return+new Date};
function va(a,b){function c(){}c.prototype=b.prototype;a.$b=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Mb=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}};function wa(a){if(Error.captureStackTrace)Error.captureStackTrace(this,wa);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}va(wa,Error);wa.prototype.name="CustomError";function xa(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")}var ya=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function Aa(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")}function Ba(a,b){return a<b?-1:a>b?1:0}
function Ca(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})}function Da(a){var b=ha(void 0)?Aa(void 0):"\\s";return a.replace(new RegExp("(^"+(b?"|["+b+"]+":"")+")([a-z])","g"),function(a,b,e){return b+e.toUpperCase()})};function Fa(a,b){b.unshift(a);wa.call(this,xa.apply(null,b));b.shift()}va(Fa,wa);Fa.prototype.name="AssertionError";function Ga(a,b){throw new Fa("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};var Ha=Array.prototype,Ja=Ha.indexOf?function(a,b,c){return Ha.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(ha(a))return ha(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},Ka=Ha.forEach?function(a,b,c){Ha.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=ha(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)};
function La(a){var b;a:{b=Na;for(var c=a.length,d=ha(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:ha(a)?a.charAt(b):a[b]}function Oa(a,b){var c=Ja(a,b),d;(d=0<=c)&&Ha.splice.call(a,c,1);return d}function Pa(a,b){return a>b?1:a<b?-1:0};var Qa;a:{var Ra=ca.navigator;if(Ra){var Sa=Ra.userAgent;if(Sa){Qa=Sa;break a}}Qa=""};function Ta(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function Ua(a,b){for(var c in a)if(b.call(void 0,a[c],c,a))return!0;return!1}function Va(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function Xa(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}var Ya="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function Za(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<Ya.length;f++)c=Ya[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}}function $a(a){var b=arguments.length;if(1==b&&"array"==u(arguments[0]))return $a.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};var ab=-1!=Qa.indexOf("Opera")||-1!=Qa.indexOf("OPR"),bb=-1!=Qa.indexOf("Trident")||-1!=Qa.indexOf("MSIE"),cb=-1!=Qa.indexOf("Edge"),db=-1!=Qa.indexOf("Gecko")&&!(-1!=Qa.toLowerCase().indexOf("webkit")&&-1==Qa.indexOf("Edge"))&&!(-1!=Qa.indexOf("Trident")||-1!=Qa.indexOf("MSIE"))&&-1==Qa.indexOf("Edge"),eb=-1!=Qa.toLowerCase().indexOf("webkit")&&-1==Qa.indexOf("Edge");
function fb(){var a=Qa;if(db)return/rv\:([^\);]+)(\)|;)/.exec(a);if(cb)return/Edge\/([\d\.]+)/.exec(a);if(bb)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(eb)return/WebKit\/(\S+)/.exec(a)}function gb(){var a=ca.document;return a?a.documentMode:void 0}var hb=function(){if(ab&&ca.opera){var a=ca.opera.version;return ia(a)?a():a}var a="",b=fb();b&&(a=b?b[1]:"");return bb&&(b=gb(),b>parseFloat(a))?String(b):a}(),jb={};
function kb(a){var b;if(!(b=jb[a])){b=0;for(var c=ya(String(hb)).split("."),d=ya(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var g=c[f]||"",k=d[f]||"",l=RegExp("(\\d*)(\\D*)","g"),m=RegExp("(\\d*)(\\D*)","g");do{var n=l.exec(g)||["","",""],p=m.exec(k)||["","",""];if(0==n[0].length&&0==p[0].length)break;b=Ba(0==n[1].length?0:parseInt(n[1],10),0==p[1].length?0:parseInt(p[1],10))||Ba(0==n[2].length,0==p[2].length)||Ba(n[2],p[2])}while(0==b)}b=jb[a]=0<=b}return b}
var lb=ca.document,mb=lb&&bb?gb()||("CSS1Compat"==lb.compatMode?parseInt(hb,10):5):void 0;!db&&!bb||bb&&9<=mb||db&&kb("1.9.1");bb&&kb("9");$a("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));function nb(a,b){null!=a&&this.append.apply(this,arguments)}h=nb.prototype;h.Ra="";h.set=function(a){this.Ra=""+a};h.append=function(a,b,c){this.Ra+=a;if(null!=b)for(var d=1;d<arguments.length;d++)this.Ra+=arguments[d];return this};h.clear=function(){this.Ra=""};h.getLength=function(){return this.Ra.length};h.toString=function(){return this.Ra};var ob={},pb;if("undefined"===typeof qb)var qb=function(){throw Error("No *print-fn* fn set for evaluation environment");};if("undefined"===typeof rb)var rb=function(){throw Error("No *print-err-fn* fn set for evaluation environment");};var sb=null;if("undefined"===typeof tb)var tb=null;function ub(){return new w(null,5,[vb,!0,wb,!0,xb,!1,yb,!1,zb,null],null)}Ab;function y(a){return null!=a&&!1!==a}Cb;B;function Db(a){return a instanceof Array}function Eb(a){return null==a?!0:!1===a?!0:!1}
function C(a,b){return a[u(null==b?null:b)]?!0:a._?!0:!1}function D(a,b){var c=null==b?null:b.constructor,c=y(y(c)?c.yc:c)?c.Sb:u(b);return Error(["No protocol method ",a," defined for type ",c,": ",b].join(""))}function Fb(a){var b=a.Sb;return y(b)?b:""+F(a)}var Gb="undefined"!==typeof Symbol&&"function"===u(Symbol)?Symbol.iterator:"@@iterator";function Hb(a){for(var b=a.length,c=Array(b),d=0;;)if(d<b)c[d]=a[d],d+=1;else break;return c}Ib;Jb;
var Ab=function Ab(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Ab.a(arguments[0]);case 2:return Ab.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Ab.a=function(a){return Ab.b(null,a)};Ab.b=function(a,b){function c(a,b){a.push(b);return a}var d=[];return Jb.c?Jb.c(c,d,b):Jb.call(null,c,d,b)};Ab.A=2;function Kb(){}
var Lb=function Lb(b){if(null!=b&&null!=b.X)return b.X(b);var c=Lb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Lb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ICounted.-count",b);};function Mb(){}var Nb=function Nb(b,c){if(null!=b&&null!=b.U)return b.U(b,c);var d=Nb[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Nb._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ICollection.-conj",b);};function Ob(){}
var G=function G(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return G.b(arguments[0],arguments[1]);case 3:return G.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
G.b=function(a,b){if(null!=a&&null!=a.O)return a.O(a,b);var c=G[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=G._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IIndexed.-nth",a);};G.c=function(a,b,c){if(null!=a&&null!=a.wa)return a.wa(a,b,c);var d=G[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=G._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IIndexed.-nth",a);};G.A=3;function Pb(){}
var Qb=function Qb(b){if(null!=b&&null!=b.aa)return b.aa(b);var c=Qb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Qb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-first",b);},Rb=function Rb(b){if(null!=b&&null!=b.sa)return b.sa(b);var c=Rb[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Rb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeq.-rest",b);};function Sb(){}function Tb(){}
var Ub=function Ub(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Ub.b(arguments[0],arguments[1]);case 3:return Ub.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Ub.b=function(a,b){if(null!=a&&null!=a.K)return a.K(a,b);var c=Ub[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Ub._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ILookup.-lookup",a);};Ub.c=function(a,b,c){if(null!=a&&null!=a.H)return a.H(a,b,c);var d=Ub[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Ub._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ILookup.-lookup",a);};Ub.A=3;
var Vb=function Vb(b,c){if(null!=b&&null!=b.hc)return b.hc(b,c);var d=Vb[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Vb._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IAssociative.-contains-key?",b);},Xb=function Xb(b,c,d){if(null!=b&&null!=b.Va)return b.Va(b,c,d);var e=Xb[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Xb._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IAssociative.-assoc",b);};function Yb(){}
function Zb(){}var $b=function $b(b){if(null!=b&&null!=b.sb)return b.sb(b);var c=$b[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=$b._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-key",b);},ac=function ac(b){if(null!=b&&null!=b.tb)return b.tb(b);var c=ac[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=ac._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMapEntry.-val",b);};function bc(){}
var cc=function cc(b){if(null!=b&&null!=b.Wa)return b.Wa(b);var c=cc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=cc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-peek",b);},dc=function dc(b){if(null!=b&&null!=b.Xa)return b.Xa(b);var c=dc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=dc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IStack.-pop",b);};function ec(){}
var fc=function fc(b,c,d){if(null!=b&&null!=b.Ya)return b.Ya(b,c,d);var e=fc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=fc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IVector.-assoc-n",b);},gc=function gc(b){if(null!=b&&null!=b.Pb)return b.Pb(b);var c=gc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=gc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IDeref.-deref",b);};function hc(){}
var ic=function ic(b){if(null!=b&&null!=b.R)return b.R(b);var c=ic[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=ic._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IMeta.-meta",b);},jc=function jc(b,c){if(null!=b&&null!=b.T)return b.T(b,c);var d=jc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=jc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWithMeta.-with-meta",b);};function lc(){}
var mc=function mc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return mc.b(arguments[0],arguments[1]);case 3:return mc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
mc.b=function(a,b){if(null!=a&&null!=a.Z)return a.Z(a,b);var c=mc[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=mc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("IReduce.-reduce",a);};mc.c=function(a,b,c){if(null!=a&&null!=a.$)return a.$(a,b,c);var d=mc[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=mc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("IReduce.-reduce",a);};mc.A=3;
var nc=function nc(b,c){if(null!=b&&null!=b.v)return b.v(b,c);var d=nc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=nc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IEquiv.-equiv",b);},oc=function oc(b){if(null!=b&&null!=b.N)return b.N(b);var c=oc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=oc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IHash.-hash",b);};function pc(){}
var qc=function qc(b){if(null!=b&&null!=b.S)return b.S(b);var c=qc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=qc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ISeqable.-seq",b);};function rc(){}function sc(){}function tc(){}
var uc=function uc(b){if(null!=b&&null!=b.Rb)return b.Rb(b);var c=uc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=uc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IReversible.-rseq",b);},vc=function vc(b,c){if(null!=b&&null!=b.xc)return b.xc(0,c);var d=vc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=vc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IWriter.-write",b);},wc=function wc(b,c,d){if(null!=b&&null!=b.L)return b.L(b,c,d);var e=
wc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=wc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IPrintWithWriter.-pr-writer",b);},xc=function xc(b,c,d){if(null!=b&&null!=b.wc)return b.wc(0,c,d);var e=xc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=xc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("IWatchable.-notify-watches",b);},yc=function yc(b){if(null!=b&&null!=b.gb)return b.gb(b);var c=yc[u(null==b?null:
b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=yc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEditableCollection.-as-transient",b);},zc=function zc(b,c){if(null!=b&&null!=b.xb)return b.xb(b,c);var d=zc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=zc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("ITransientCollection.-conj!",b);},Ac=function Ac(b){if(null!=b&&null!=b.yb)return b.yb(b);var c=Ac[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Ac._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("ITransientCollection.-persistent!",b);},Bc=function Bc(b,c,d){if(null!=b&&null!=b.wb)return b.wb(b,c,d);var e=Bc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Bc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientAssociative.-assoc!",b);},Cc=function Cc(b,c,d){if(null!=b&&null!=b.vc)return b.vc(0,c,d);var e=Cc[u(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Cc._;
if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw D("ITransientVector.-assoc-n!",b);};function Dc(){}
var Fc=function Fc(b,c){if(null!=b&&null!=b.fb)return b.fb(b,c);var d=Fc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Fc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IComparable.-compare",b);},Gc=function Gc(b){if(null!=b&&null!=b.sc)return b.sc();var c=Gc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Gc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunk.-drop-first",b);},Hc=function Hc(b){if(null!=b&&null!=b.jc)return b.jc(b);var c=
Hc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-first",b);},Ic=function Ic(b){if(null!=b&&null!=b.kc)return b.kc(b);var c=Ic[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Ic._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedSeq.-chunked-rest",b);},Jc=function Jc(b){if(null!=b&&null!=b.ic)return b.ic(b);var c=Jc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Jc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IChunkedNext.-chunked-next",b);},Kc=function Kc(b){if(null!=b&&null!=b.ub)return b.ub(b);var c=Kc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Kc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-name",b);},Lc=function Lc(b){if(null!=b&&null!=b.vb)return b.vb(b);var c=Lc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Lc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("INamed.-namespace",
b);},Mc=function Mc(b,c){if(null!=b&&null!=b.Wc)return b.Wc(b,c);var d=Mc[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Mc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("IReset.-reset!",b);},Nc=function Nc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Nc.b(arguments[0],arguments[1]);case 3:return Nc.c(arguments[0],arguments[1],arguments[2]);case 4:return Nc.m(arguments[0],arguments[1],arguments[2],
arguments[3]);case 5:return Nc.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Nc.b=function(a,b){if(null!=a&&null!=a.Yc)return a.Yc(a,b);var c=Nc[u(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Nc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw D("ISwap.-swap!",a);};
Nc.c=function(a,b,c){if(null!=a&&null!=a.Zc)return a.Zc(a,b,c);var d=Nc[u(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Nc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw D("ISwap.-swap!",a);};Nc.m=function(a,b,c,d){if(null!=a&&null!=a.$c)return a.$c(a,b,c,d);var e=Nc[u(null==a?null:a)];if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);e=Nc._;if(null!=e)return e.m?e.m(a,b,c,d):e.call(null,a,b,c,d);throw D("ISwap.-swap!",a);};
Nc.C=function(a,b,c,d,e){if(null!=a&&null!=a.ad)return a.ad(a,b,c,d,e);var f=Nc[u(null==a?null:a)];if(null!=f)return f.C?f.C(a,b,c,d,e):f.call(null,a,b,c,d,e);f=Nc._;if(null!=f)return f.C?f.C(a,b,c,d,e):f.call(null,a,b,c,d,e);throw D("ISwap.-swap!",a);};Nc.A=5;var Oc=function Oc(b){if(null!=b&&null!=b.Ma)return b.Ma(b);var c=Oc[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Oc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IIterable.-iterator",b);};
function Pc(a){this.od=a;this.i=1073741824;this.B=0}Pc.prototype.xc=function(a,b){return this.od.append(b)};function Qc(a){var b=new nb;a.L(null,new Pc(b),ub());return""+F(b)}var Rc="undefined"!==typeof Math.imul&&0!==Math.imul(4294967295,5)?function(a,b){return Math.imul(a,b)}:function(a,b){var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};function Sc(a){a=Rc(a|0,-862048943);return Rc(a<<15|a>>>-15,461845907)}
function Tc(a,b){var c=(a|0)^(b|0);return Rc(c<<13|c>>>-13,5)+-430675100|0}function Uc(a,b){var c=(a|0)^b,c=Rc(c^c>>>16,-2048144789),c=Rc(c^c>>>13,-1028477387);return c^c>>>16}function Vc(a){var b;a:{b=1;for(var c=0;;)if(b<a.length){var d=b+2,c=Tc(c,Sc(a.charCodeAt(b-1)|a.charCodeAt(b)<<16));b=d}else{b=c;break a}}b=1===(a.length&1)?b^Sc(a.charCodeAt(a.length-1)):b;return Uc(b,Rc(2,a.length))}Wc;Xc;Yc;Zc;var $c={},ad=0;
function bd(a){255<ad&&($c={},ad=0);var b=$c[a];if("number"!==typeof b){a:if(null!=a)if(b=a.length,0<b)for(var c=0,d=0;;)if(c<b)var e=c+1,d=Rc(31,d)+a.charCodeAt(c),c=e;else{b=d;break a}else b=0;else b=0;$c[a]=b;ad+=1}return a=b}function cd(a){null!=a&&(a.i&4194304||a.td)?a=a.N(null):"number"===typeof a?a=Math.floor(a)%2147483647:!0===a?a=1:!1===a?a=0:"string"===typeof a?(a=bd(a),0!==a&&(a=Sc(a),a=Tc(0,a),a=Uc(a,4))):a=a instanceof Date?a.valueOf():null==a?0:oc(a);return a}
function dd(a,b){return a^b+2654435769+(a<<6)+(a>>2)}function Cb(a,b){return b instanceof a}function ed(a,b){if(a.La===b.La)return 0;var c=Eb(a.qa);if(y(c?b.qa:c))return-1;if(y(a.qa)){if(Eb(b.qa))return 1;c=Pa(a.qa,b.qa);return 0===c?Pa(a.name,b.name):c}return Pa(a.name,b.name)}fd;function Xc(a,b,c,d,e){this.qa=a;this.name=b;this.La=c;this.eb=d;this.Ba=e;this.i=2154168321;this.B=4096}h=Xc.prototype;h.toString=function(){return this.La};h.equiv=function(a){return this.v(null,a)};
h.v=function(a,b){return b instanceof Xc?this.La===b.La:!1};h.call=function(){function a(a,b,c){return fd.c?fd.c(b,this,c):fd.call(null,b,this,c)}function b(a,b){return fd.b?fd.b(b,this):fd.call(null,b,this)}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,0,e);case 3:return a.call(this,0,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};
h.a=function(a){return fd.b?fd.b(a,this):fd.call(null,a,this)};h.b=function(a,b){return fd.c?fd.c(a,this,b):fd.call(null,a,this,b)};h.R=function(){return this.Ba};h.T=function(a,b){return new Xc(this.qa,this.name,this.La,this.eb,b)};h.N=function(){var a=this.eb;return null!=a?a:this.eb=a=dd(Vc(this.name),bd(this.qa))};h.ub=function(){return this.name};h.vb=function(){return this.qa};h.L=function(a,b){return vc(b,this.La)};
var gd=function gd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return gd.a(arguments[0]);case 2:return gd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};gd.a=function(a){if(a instanceof Xc)return a;var b=a.indexOf("/");return-1===b?gd.b(null,a):gd.b(a.substring(0,b),a.substring(b+1,a.length))};gd.b=function(a,b){var c=null!=a?[F(a),F("/"),F(b)].join(""):b;return new Xc(a,b,c,null,null)};
gd.A=2;hd;id;jd;function H(a){if(null==a)return null;if(null!=a&&(a.i&8388608||a.Xc))return a.S(null);if(Db(a)||"string"===typeof a)return 0===a.length?null:new jd(a,0);if(C(pc,a))return qc(a);throw Error([F(a),F(" is not ISeqable")].join(""));}function J(a){if(null==a)return null;if(null!=a&&(a.i&64||a.hb))return a.aa(null);a=H(a);return null==a?null:Qb(a)}function kd(a){return null!=a?null!=a&&(a.i&64||a.hb)?a.sa(null):(a=H(a))?Rb(a):ld:ld}
function K(a){return null==a?null:null!=a&&(a.i&128||a.Qb)?a.ra(null):H(kd(a))}var Yc=function Yc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Yc.a(arguments[0]);case 2:return Yc.b(arguments[0],arguments[1]);default:return Yc.o(arguments[0],arguments[1],new jd(c.slice(2),0))}};Yc.a=function(){return!0};Yc.b=function(a,b){return null==a?null==b:a===b||nc(a,b)};
Yc.o=function(a,b,c){for(;;)if(Yc.b(a,b))if(K(c))a=b,b=J(c),c=K(c);else return Yc.b(b,J(c));else return!1};Yc.G=function(a){var b=J(a),c=K(a);a=J(c);c=K(c);return Yc.o(b,a,c)};Yc.A=2;function md(a){this.D=a}md.prototype.next=function(){if(null!=this.D){var a=J(this.D);this.D=K(this.D);return{value:a,done:!1}}return{value:null,done:!0}};function nd(a){return new md(H(a))}od;function pd(a,b,c){this.value=a;this.kb=b;this.ec=c;this.i=8388672;this.B=0}pd.prototype.S=function(){return this};
pd.prototype.aa=function(){return this.value};pd.prototype.sa=function(){null==this.ec&&(this.ec=od.a?od.a(this.kb):od.call(null,this.kb));return this.ec};function od(a){var b=a.next();return y(b.done)?ld:new pd(b.value,a,null)}function qd(a,b){var c=Sc(a),c=Tc(0,c);return Uc(c,b)}function rd(a){var b=0,c=1;for(a=H(a);;)if(null!=a)b+=1,c=Rc(31,c)+cd(J(a))|0,a=K(a);else return qd(c,b)}var sd=qd(1,0);function td(a){var b=0,c=0;for(a=H(a);;)if(null!=a)b+=1,c=c+cd(J(a))|0,a=K(a);else return qd(c,b)}
var ud=qd(0,0);vd;Wc;wd;Kb["null"]=!0;Lb["null"]=function(){return 0};Date.prototype.v=function(a,b){return b instanceof Date&&this.valueOf()===b.valueOf()};Date.prototype.qb=!0;Date.prototype.fb=function(a,b){if(b instanceof Date)return Pa(this.valueOf(),b.valueOf());throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};nc.number=function(a,b){return a===b};yd;hc["function"]=!0;ic["function"]=function(){return null};oc._=function(a){return ka(a)};L;
function zd(a){this.J=a;this.i=32768;this.B=0}zd.prototype.Pb=function(){return this.J};function Ad(a){return a instanceof zd}function L(a){return gc(a)}function Bd(a,b){var c=Lb(a);if(0===c)return b.w?b.w():b.call(null);for(var d=G.b(a,0),e=1;;)if(e<c){var f=G.b(a,e),d=b.b?b.b(d,f):b.call(null,d,f);if(Ad(d))return gc(d);e+=1}else return d}function Cd(a,b,c){var d=Lb(a),e=c;for(c=0;;)if(c<d){var f=G.b(a,c),e=b.b?b.b(e,f):b.call(null,e,f);if(Ad(e))return gc(e);c+=1}else return e}
function Dd(a,b){var c=a.length;if(0===a.length)return b.w?b.w():b.call(null);for(var d=a[0],e=1;;)if(e<c){var f=a[e],d=b.b?b.b(d,f):b.call(null,d,f);if(Ad(d))return gc(d);e+=1}else return d}function Ed(a,b,c){var d=a.length,e=c;for(c=0;;)if(c<d){var f=a[c],e=b.b?b.b(e,f):b.call(null,e,f);if(Ad(e))return gc(e);c+=1}else return e}function Fd(a,b,c,d){for(var e=a.length;;)if(d<e){var f=a[d];c=b.b?b.b(c,f):b.call(null,c,f);if(Ad(c))return gc(c);d+=1}else return c}Gd;M;Hd;Id;
function Jd(a){return null!=a?a.i&2||a.Nc?!0:a.i?!1:C(Kb,a):C(Kb,a)}function Kd(a){return null!=a?a.i&16||a.tc?!0:a.i?!1:C(Ob,a):C(Ob,a)}function Ld(a,b){this.f=a;this.l=b}Ld.prototype.xa=function(){return this.l<this.f.length};Ld.prototype.next=function(){var a=this.f[this.l];this.l+=1;return a};function jd(a,b){this.f=a;this.l=b;this.i=166199550;this.B=8192}h=jd.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};
h.O=function(a,b){var c=b+this.l;return c<this.f.length?this.f[c]:null};h.wa=function(a,b,c){a=b+this.l;return a<this.f.length?this.f[a]:c};h.Ma=function(){return new Ld(this.f,this.l)};h.ra=function(){return this.l+1<this.f.length?new jd(this.f,this.l+1):null};h.X=function(){var a=this.f.length-this.l;return 0>a?0:a};h.Rb=function(){var a=Lb(this);return 0<a?new Hd(this,a-1,null):null};h.N=function(){return rd(this)};h.v=function(a,b){return wd.b?wd.b(this,b):wd.call(null,this,b)};
h.Z=function(a,b){return Fd(this.f,b,this.f[this.l],this.l+1)};h.$=function(a,b,c){return Fd(this.f,b,c,this.l)};h.aa=function(){return this.f[this.l]};h.sa=function(){return this.l+1<this.f.length?new jd(this.f,this.l+1):ld};h.S=function(){return this.l<this.f.length?this:null};h.U=function(a,b){return M.b?M.b(b,this):M.call(null,b,this)};jd.prototype[Gb]=function(){return nd(this)};
var id=function id(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return id.a(arguments[0]);case 2:return id.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};id.a=function(a){return id.b(a,0)};id.b=function(a,b){return b<a.length?new jd(a,b):null};id.A=2;
var hd=function hd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return hd.a(arguments[0]);case 2:return hd.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};hd.a=function(a){return id.b(a,0)};hd.b=function(a,b){return id.b(a,b)};hd.A=2;yd;Md;function Hd(a,b,c){this.Ob=a;this.l=b;this.u=c;this.i=32374990;this.B=8192}h=Hd.prototype;h.toString=function(){return Qc(this)};
h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return 0<this.l?new Hd(this.Ob,this.l-1,null):null};h.X=function(){return this.l+1};h.N=function(){return rd(this)};h.v=function(a,b){return wd.b?wd.b(this,b):wd.call(null,this,b)};h.Z=function(a,b){return Md.b?Md.b(b,this):Md.call(null,b,this)};h.$=function(a,b,c){return Md.c?Md.c(b,c,this):Md.call(null,b,c,this)};h.aa=function(){return G.b(this.Ob,this.l)};
h.sa=function(){return 0<this.l?new Hd(this.Ob,this.l-1,null):ld};h.S=function(){return this};h.T=function(a,b){return new Hd(this.Ob,this.l,b)};h.U=function(a,b){return M.b?M.b(b,this):M.call(null,b,this)};Hd.prototype[Gb]=function(){return nd(this)};function Nd(a){return J(K(a))}nc._=function(a,b){return a===b};
var Od=function Od(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Od.w();case 1:return Od.a(arguments[0]);case 2:return Od.b(arguments[0],arguments[1]);default:return Od.o(arguments[0],arguments[1],new jd(c.slice(2),0))}};Od.w=function(){return Pd};Od.a=function(a){return a};Od.b=function(a,b){return null!=a?Nb(a,b):Nb(ld,b)};Od.o=function(a,b,c){for(;;)if(y(c))a=Od.b(a,b),b=J(c),c=K(c);else return Od.b(a,b)};
Od.G=function(a){var b=J(a),c=K(a);a=J(c);c=K(c);return Od.o(b,a,c)};Od.A=2;function N(a){if(null!=a)if(null!=a&&(a.i&2||a.Nc))a=a.X(null);else if(Db(a))a=a.length;else if("string"===typeof a)a=a.length;else if(null!=a&&(a.i&8388608||a.Xc))a:{a=H(a);for(var b=0;;){if(Jd(a)){a=b+Lb(a);break a}a=K(a);b+=1}}else a=Lb(a);else a=0;return a}function Qd(a,b){for(var c=null;;){if(null==a)return c;if(0===b)return H(a)?J(a):c;if(Kd(a))return G.c(a,b,c);if(H(a)){var d=K(a),e=b-1;a=d;b=e}else return c}}
function Rd(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number");if(null==a)return a;if(null!=a&&(a.i&16||a.tc))return a.O(null,b);if(Db(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.hb)){var c;a:{c=a;for(var d=b;;){if(null==c)throw Error("Index out of bounds");if(0===d){if(H(c)){c=J(c);break a}throw Error("Index out of bounds");}if(Kd(c)){c=G.b(c,d);break a}if(H(c))c=K(c),--d;else throw Error("Index out of bounds");
}}return c}if(C(Ob,a))return G.b(a,b);throw Error([F("nth not supported on this type "),F(Fb(null==a?null:a.constructor))].join(""));}
function O(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number.");if(null==a)return null;if(null!=a&&(a.i&16||a.tc))return a.wa(null,b,null);if(Db(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.hb))return Qd(a,b);if(C(Ob,a))return G.b(a,b);throw Error([F("nth not supported on this type "),F(Fb(null==a?null:a.constructor))].join(""));}
var fd=function fd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return fd.b(arguments[0],arguments[1]);case 3:return fd.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};fd.b=function(a,b){return null==a?null:null!=a&&(a.i&256||a.uc)?a.K(null,b):Db(a)?b<a.length?a[b|0]:null:"string"===typeof a?b<a.length?a[b|0]:null:C(Tb,a)?Ub.b(a,b):null};
fd.c=function(a,b,c){return null!=a?null!=a&&(a.i&256||a.uc)?a.H(null,b,c):Db(a)?b<a.length?a[b]:c:"string"===typeof a?b<a.length?a[b]:c:C(Tb,a)?Ub.c(a,b,c):c:c};fd.A=3;Sd;var Td=function Td(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Td.c(arguments[0],arguments[1],arguments[2]);default:return Td.o(arguments[0],arguments[1],arguments[2],new jd(c.slice(3),0))}};
Td.c=function(a,b,c){if(null!=a)a=Xb(a,b,c);else a:{a=[b];c=[c];b=a.length;var d=0,e;for(e=yc(Ud);;)if(d<b){var f=d+1;e=e.wb(null,a[d],c[d]);d=f}else{a=Ac(e);break a}}return a};Td.o=function(a,b,c,d){for(;;)if(a=Td.c(a,b,c),y(d))b=J(d),c=Nd(d),d=K(K(d));else return a};Td.G=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),d=K(d);return Td.o(b,a,c,d)};Td.A=3;function Vd(a,b){this.g=a;this.u=b;this.i=393217;this.B=0}h=Vd.prototype;h.R=function(){return this.u};
h.T=function(a,b){return new Vd(this.g,b)};
h.call=function(){function a(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I,S){a=this;return Ib.rb?Ib.rb(a.g,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I,S):Ib.call(null,a.g,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I,S)}function b(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I){a=this;return a.g.ma?a.g.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I)}function c(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E){a=this;return a.g.la?a.g.la(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,
E):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E)}function d(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z){a=this;return a.g.ka?a.g.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z)}function e(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A){a=this;return a.g.ja?a.g.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A)}function f(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x){a=this;return a.g.ia?a.g.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):a.g.call(null,
b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x)}function g(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){a=this;return a.g.ha?a.g.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)}function k(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){a=this;return a.g.ga?a.g.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,t):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t)}function l(a,b,c,d,e,f,g,k,l,m,n,p,q,r){a=this;return a.g.fa?a.g.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r)}function m(a,b,c,d,e,f,g,k,l,m,n,p,q){a=this;
return a.g.ea?a.g.ea(b,c,d,e,f,g,k,l,m,n,p,q):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p,q)}function n(a,b,c,d,e,f,g,k,l,m,n,p){a=this;return a.g.da?a.g.da(b,c,d,e,f,g,k,l,m,n,p):a.g.call(null,b,c,d,e,f,g,k,l,m,n,p)}function p(a,b,c,d,e,f,g,k,l,m,n){a=this;return a.g.ca?a.g.ca(b,c,d,e,f,g,k,l,m,n):a.g.call(null,b,c,d,e,f,g,k,l,m,n)}function q(a,b,c,d,e,f,g,k,l,m){a=this;return a.g.oa?a.g.oa(b,c,d,e,f,g,k,l,m):a.g.call(null,b,c,d,e,f,g,k,l,m)}function r(a,b,c,d,e,f,g,k,l){a=this;return a.g.na?a.g.na(b,c,
d,e,f,g,k,l):a.g.call(null,b,c,d,e,f,g,k,l)}function t(a,b,c,d,e,f,g,k){a=this;return a.g.W?a.g.W(b,c,d,e,f,g,k):a.g.call(null,b,c,d,e,f,g,k)}function v(a,b,c,d,e,f,g){a=this;return a.g.V?a.g.V(b,c,d,e,f,g):a.g.call(null,b,c,d,e,f,g)}function x(a,b,c,d,e,f){a=this;return a.g.C?a.g.C(b,c,d,e,f):a.g.call(null,b,c,d,e,f)}function A(a,b,c,d,e){a=this;return a.g.m?a.g.m(b,c,d,e):a.g.call(null,b,c,d,e)}function E(a,b,c,d){a=this;return a.g.c?a.g.c(b,c,d):a.g.call(null,b,c,d)}function I(a,b,c){a=this;return a.g.b?
a.g.b(b,c):a.g.call(null,b,c)}function S(a,b){a=this;return a.g.a?a.g.a(b):a.g.call(null,b)}function pa(a){a=this;return a.g.w?a.g.w():a.g.call(null)}var z=null,z=function(Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa,ib,Bb,Wb,Ec,xd,qf){switch(arguments.length){case 1:return pa.call(this,Ea);case 2:return S.call(this,Ea,R);case 3:return I.call(this,Ea,R,T);case 4:return E.call(this,Ea,R,T,V);case 5:return A.call(this,Ea,R,T,V,Z);case 6:return x.call(this,Ea,R,T,V,Z,ba);case 7:return v.call(this,Ea,R,
T,V,Z,ba,ga);case 8:return t.call(this,Ea,R,T,V,Z,ba,ga,ja);case 9:return r.call(this,Ea,R,T,V,Z,ba,ga,ja,ma);case 10:return q.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa);case 11:return p.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua);case 12:return n.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za);case 13:return m.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia);case 14:return l.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma);case 15:return k.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z);case 16:return g.call(this,
Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa);case 17:return f.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa,ib);case 18:return e.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa,ib,Bb);case 19:return d.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa,ib,Bb,Wb);case 20:return c.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa,ib,Bb,Wb,Ec);case 21:return b.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,z,Wa,ib,Bb,Wb,Ec,xd);case 22:return a.call(this,Ea,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,
Ia,Ma,z,Wa,ib,Bb,Wb,Ec,xd,qf)}throw Error("Invalid arity: "+arguments.length);};z.a=pa;z.b=S;z.c=I;z.m=E;z.C=A;z.V=x;z.W=v;z.na=t;z.oa=r;z.ca=q;z.da=p;z.ea=n;z.fa=m;z.ga=l;z.ha=k;z.ia=g;z.ja=f;z.ka=e;z.la=d;z.ma=c;z.lc=b;z.rb=a;return z}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.w=function(){return this.g.w?this.g.w():this.g.call(null)};h.a=function(a){return this.g.a?this.g.a(a):this.g.call(null,a)};
h.b=function(a,b){return this.g.b?this.g.b(a,b):this.g.call(null,a,b)};h.c=function(a,b,c){return this.g.c?this.g.c(a,b,c):this.g.call(null,a,b,c)};h.m=function(a,b,c,d){return this.g.m?this.g.m(a,b,c,d):this.g.call(null,a,b,c,d)};h.C=function(a,b,c,d,e){return this.g.C?this.g.C(a,b,c,d,e):this.g.call(null,a,b,c,d,e)};h.V=function(a,b,c,d,e,f){return this.g.V?this.g.V(a,b,c,d,e,f):this.g.call(null,a,b,c,d,e,f)};
h.W=function(a,b,c,d,e,f,g){return this.g.W?this.g.W(a,b,c,d,e,f,g):this.g.call(null,a,b,c,d,e,f,g)};h.na=function(a,b,c,d,e,f,g,k){return this.g.na?this.g.na(a,b,c,d,e,f,g,k):this.g.call(null,a,b,c,d,e,f,g,k)};h.oa=function(a,b,c,d,e,f,g,k,l){return this.g.oa?this.g.oa(a,b,c,d,e,f,g,k,l):this.g.call(null,a,b,c,d,e,f,g,k,l)};h.ca=function(a,b,c,d,e,f,g,k,l,m){return this.g.ca?this.g.ca(a,b,c,d,e,f,g,k,l,m):this.g.call(null,a,b,c,d,e,f,g,k,l,m)};
h.da=function(a,b,c,d,e,f,g,k,l,m,n){return this.g.da?this.g.da(a,b,c,d,e,f,g,k,l,m,n):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n)};h.ea=function(a,b,c,d,e,f,g,k,l,m,n,p){return this.g.ea?this.g.ea(a,b,c,d,e,f,g,k,l,m,n,p):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p)};h.fa=function(a,b,c,d,e,f,g,k,l,m,n,p,q){return this.g.fa?this.g.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q)};
h.ga=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r){return this.g.ga?this.g.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r)};h.ha=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){return this.g.ha?this.g.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t)};h.ia=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){return this.g.ia?this.g.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)};
h.ja=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x){return this.g.ja?this.g.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x)};h.ka=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A){return this.g.ka?this.g.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A)};
h.la=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E){return this.g.la?this.g.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E)};h.ma=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I){return this.g.ma?this.g.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I):this.g.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I)};
h.lc=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S){return Ib.rb?Ib.rb(this.g,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S):Ib.call(null,this.g,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S)};function yd(a,b){return ia(a)?new Vd(a,b):null==a?null:jc(a,b)}function Wd(a){var b=null!=a;return(b?null!=a?a.i&131072||a.Tc||(a.i?0:C(hc,a)):C(hc,a):b)?ic(a):null}function Xd(a){return null==a?!1:null!=a?a.i&4096||a.xd?!0:a.i?!1:C(bc,a):C(bc,a)}
function Yd(a){return null!=a?a.i&16777216||a.wd?!0:a.i?!1:C(rc,a):C(rc,a)}function Zd(a){return null==a?!1:null!=a?a.i&1024||a.Rc?!0:a.i?!1:C(Yb,a):C(Yb,a)}function $d(a){return null!=a?a.i&16384||a.yd?!0:a.i?!1:C(ec,a):C(ec,a)}ae;be;function ce(a){return null!=a?a.B&512||a.rd?!0:!1:!1}function de(a){var b=[];Ta(a,function(a,b){return function(a,c){return b.push(c)}}(a,b));return b}function ee(a,b,c,d,e){for(;0!==e;)c[d]=a[b],d+=1,--e,b+=1}var fe={};
function ge(a){return null==a?!1:null!=a?a.i&64||a.hb?!0:a.i?!1:C(Pb,a):C(Pb,a)}function he(a){return null==a?!1:!1===a?!1:!0}function ie(a,b){return fd.c(a,b,fe)===fe?!1:!0}
function Zc(a,b){if(a===b)return 0;if(null==a)return-1;if(null==b)return 1;if("number"===typeof a){if("number"===typeof b)return Pa(a,b);throw Error([F("Cannot compare "),F(a),F(" to "),F(b)].join(""));}if(null!=a?a.B&2048||a.qb||(a.B?0:C(Dc,a)):C(Dc,a))return Fc(a,b);if("string"!==typeof a&&!Db(a)&&!0!==a&&!1!==a||(null==a?null:a.constructor)!==(null==b?null:b.constructor))throw Error([F("Cannot compare "),F(a),F(" to "),F(b)].join(""));return Pa(a,b)}
function je(a,b){var c=N(a),d=N(b);if(c<d)c=-1;else if(c>d)c=1;else if(0===c)c=0;else a:for(d=0;;){var e=Zc(Rd(a,d),Rd(b,d));if(0===e&&d+1<c)d+=1;else{c=e;break a}}return c}ke;var Md=function Md(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Md.b(arguments[0],arguments[1]);case 3:return Md.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Md.b=function(a,b){var c=H(b);if(c){var d=J(c),c=K(c);return Jb.c?Jb.c(a,d,c):Jb.call(null,a,d,c)}return a.w?a.w():a.call(null)};Md.c=function(a,b,c){for(c=H(c);;)if(c){var d=J(c);b=a.b?a.b(b,d):a.call(null,b,d);if(Ad(b))return gc(b);c=K(c)}else return b};Md.A=3;le;
var Jb=function Jb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Jb.b(arguments[0],arguments[1]);case 3:return Jb.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Jb.b=function(a,b){return null!=b&&(b.i&524288||b.Vc)?b.Z(null,a):Db(b)?Dd(b,a):"string"===typeof b?Dd(b,a):C(lc,b)?mc.b(b,a):Md.b(a,b)};
Jb.c=function(a,b,c){return null!=c&&(c.i&524288||c.Vc)?c.$(null,a,b):Db(c)?Ed(c,a,b):"string"===typeof c?Ed(c,a,b):C(lc,c)?mc.c(c,a,b):Md.c(a,b,c)};Jb.A=3;function me(a){return a}function ne(a,b,c,d){a=a.a?a.a(b):a.call(null,b);c=Jb.c(a,c,d);return a.a?a.a(c):a.call(null,c)}ob.Cd;oe;function oe(a,b){return(a%b+b)%b}function pe(a){a=(a-a%2)/2;return 0<=a?Math.floor(a):Math.ceil(a)}function qe(a){a-=a>>1&1431655765;a=(a&858993459)+(a>>2&858993459);return 16843009*(a+(a>>4)&252645135)>>24}
function re(a){var b=1;for(a=H(a);;)if(a&&0<b)--b,a=K(a);else return a}var F=function F(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return F.w();case 1:return F.a(arguments[0]);default:return F.o(arguments[0],new jd(c.slice(1),0))}};F.w=function(){return""};F.a=function(a){return null==a?"":""+a};F.o=function(a,b){for(var c=new nb(""+F(a)),d=b;;)if(y(d))c=c.append(""+F(J(d))),d=K(d);else return c.toString()};
F.G=function(a){var b=J(a);a=K(a);return F.o(b,a)};F.A=1;se;te;function wd(a,b){var c;if(Yd(b))if(Jd(a)&&Jd(b)&&N(a)!==N(b))c=!1;else a:{c=H(a);for(var d=H(b);;){if(null==c){c=null==d;break a}if(null!=d&&Yc.b(J(c),J(d)))c=K(c),d=K(d);else{c=!1;break a}}}else c=null;return he(c)}function Gd(a){if(H(a)){var b=cd(J(a));for(a=K(a);;){if(null==a)return b;b=dd(b,cd(J(a)));a=K(a)}}else return 0}ue;ve;te;we;xe;
function Id(a,b,c,d,e){this.u=a;this.first=b;this.ua=c;this.count=d;this.s=e;this.i=65937646;this.B=8192}h=Id.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return 1===this.count?null:this.ua};h.X=function(){return this.count};h.Wa=function(){return this.first};h.Xa=function(){return Rb(this)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};
h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return this.first};h.sa=function(){return 1===this.count?ld:this.ua};h.S=function(){return this};h.T=function(a,b){return new Id(b,this.first,this.ua,this.count,this.s)};h.U=function(a,b){return new Id(this.u,b,this,this.count+1,null)};Id.prototype[Gb]=function(){return nd(this)};function ye(a){this.u=a;this.i=65937614;this.B=8192}h=ye.prototype;h.toString=function(){return Qc(this)};
h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){return null};h.X=function(){return 0};h.Wa=function(){return null};h.Xa=function(){throw Error("Can't pop empty list");};h.N=function(){return sd};h.v=function(a,b){return(null!=b?b.i&33554432||b.ud||(b.i?0:C(sc,b)):C(sc,b))||Yd(b)?null==H(b):!1};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return null};h.sa=function(){return ld};h.S=function(){return null};
h.T=function(a,b){return new ye(b)};h.U=function(a,b){return new Id(this.u,b,null,1,null)};var ld=new ye(null);ye.prototype[Gb]=function(){return nd(this)};function ze(a){return(null!=a?a.i&134217728||a.vd||(a.i?0:C(tc,a)):C(tc,a))?uc(a):Jb.c(Od,ld,a)}var Wc=function Wc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Wc.o(0<c.length?new jd(c.slice(0),0):null)};
Wc.o=function(a){var b;if(a instanceof jd&&0===a.l)b=a.f;else a:for(b=[];;)if(null!=a)b.push(a.aa(null)),a=a.ra(null);else break a;a=b.length;for(var c=ld;;)if(0<a){var d=a-1,c=c.U(null,b[a-1]);a=d}else return c};Wc.A=0;Wc.G=function(a){return Wc.o(H(a))};function Ae(a,b,c,d){this.u=a;this.first=b;this.ua=c;this.s=d;this.i=65929452;this.B=8192}h=Ae.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.ra=function(){return null==this.ua?null:H(this.ua)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return this.first};h.sa=function(){return null==this.ua?ld:this.ua};h.S=function(){return this};h.T=function(a,b){return new Ae(b,this.first,this.ua,this.s)};h.U=function(a,b){return new Ae(null,b,this,this.s)};Ae.prototype[Gb]=function(){return nd(this)};
function M(a,b){var c=null==b;return(c?c:null!=b&&(b.i&64||b.hb))?new Ae(null,a,b,null):new Ae(null,a,H(b),null)}function Be(a,b){if(a.Ja===b.Ja)return 0;var c=Eb(a.qa);if(y(c?b.qa:c))return-1;if(y(a.qa)){if(Eb(b.qa))return 1;c=Pa(a.qa,b.qa);return 0===c?Pa(a.name,b.name):c}return Pa(a.name,b.name)}function B(a,b,c,d){this.qa=a;this.name=b;this.Ja=c;this.eb=d;this.i=2153775105;this.B=4096}h=B.prototype;h.toString=function(){return[F(":"),F(this.Ja)].join("")};
h.equiv=function(a){return this.v(null,a)};h.v=function(a,b){return b instanceof B?this.Ja===b.Ja:!1};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return fd.b(c,this);case 3:return fd.c(c,this,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return fd.b(c,this)};a.c=function(a,c,d){return fd.c(c,this,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return fd.b(a,this)};
h.b=function(a,b){return fd.c(a,this,b)};h.N=function(){var a=this.eb;return null!=a?a:this.eb=a=dd(Vc(this.name),bd(this.qa))+2654435769|0};h.ub=function(){return this.name};h.vb=function(){return this.qa};h.L=function(a,b){return vc(b,[F(":"),F(this.Ja)].join(""))};
var Ce=function Ce(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Ce.a(arguments[0]);case 2:return Ce.b(arguments[0],arguments[1]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
Ce.a=function(a){if(a instanceof B)return a;if(a instanceof Xc){var b;if(null!=a&&(a.B&4096||a.Uc))b=a.vb(null);else throw Error([F("Doesn't support namespace: "),F(a)].join(""));return new B(b,te.a?te.a(a):te.call(null,a),a.La,null)}return"string"===typeof a?(b=a.split("/"),2===b.length?new B(b[0],b[1],a,null):new B(null,b[0],a,null)):null};Ce.b=function(a,b){return new B(a,b,[F(y(a)?[F(a),F("/")].join(""):null),F(b)].join(""),null)};Ce.A=2;
function De(a,b,c,d){this.u=a;this.jb=b;this.D=c;this.s=d;this.i=32374988;this.B=0}h=De.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};function Ee(a){null!=a.jb&&(a.D=a.jb.w?a.jb.w():a.jb.call(null),a.jb=null);return a.D}h.R=function(){return this.u};h.ra=function(){qc(this);return null==this.D?null:K(this.D)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};
h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){qc(this);return null==this.D?null:J(this.D)};h.sa=function(){qc(this);return null!=this.D?kd(this.D):ld};h.S=function(){Ee(this);if(null==this.D)return null;for(var a=this.D;;)if(a instanceof De)a=Ee(a);else return this.D=a,H(this.D)};h.T=function(a,b){return new De(b,this.jb,this.D,this.s)};h.U=function(a,b){return M(b,this)};De.prototype[Gb]=function(){return nd(this)};Fe;function Ge(a,b){this.fc=a;this.end=b;this.i=2;this.B=0}
Ge.prototype.add=function(a){this.fc[this.end]=a;return this.end+=1};Ge.prototype.Ia=function(){var a=new Fe(this.fc,0,this.end);this.fc=null;return a};Ge.prototype.X=function(){return this.end};function Fe(a,b,c){this.f=a;this.ba=b;this.end=c;this.i=524306;this.B=0}h=Fe.prototype;h.X=function(){return this.end-this.ba};h.O=function(a,b){return this.f[this.ba+b]};h.wa=function(a,b,c){return 0<=b&&b<this.end-this.ba?this.f[this.ba+b]:c};
h.sc=function(){if(this.ba===this.end)throw Error("-drop-first of empty chunk");return new Fe(this.f,this.ba+1,this.end)};h.Z=function(a,b){return Fd(this.f,b,this.f[this.ba],this.ba+1)};h.$=function(a,b,c){return Fd(this.f,b,c,this.ba)};function ae(a,b,c,d){this.Ia=a;this.Ka=b;this.u=c;this.s=d;this.i=31850732;this.B=1536}h=ae.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.ra=function(){if(1<Lb(this.Ia))return new ae(Gc(this.Ia),this.Ka,this.u,null);var a=qc(this.Ka);return null==a?null:a};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.aa=function(){return G.b(this.Ia,0)};h.sa=function(){return 1<Lb(this.Ia)?new ae(Gc(this.Ia),this.Ka,this.u,null):null==this.Ka?ld:this.Ka};h.S=function(){return this};h.jc=function(){return this.Ia};h.kc=function(){return null==this.Ka?ld:this.Ka};
h.T=function(a,b){return new ae(this.Ia,this.Ka,b,this.s)};h.U=function(a,b){return M(b,this)};h.ic=function(){return null==this.Ka?null:this.Ka};ae.prototype[Gb]=function(){return nd(this)};function He(a,b){return 0===Lb(a)?b:new ae(a,b,null,null)}function Ie(a,b){a.add(b)}function we(a){return Hc(a)}function xe(a){return Ic(a)}function ke(a){for(var b=[];;)if(H(a))b.push(J(a)),a=K(a);else return b}
function Je(a,b){if(Jd(a))return N(a);for(var c=a,d=b,e=0;;)if(0<d&&H(c))c=K(c),--d,e+=1;else return e}var Ke=function Ke(b){return null==b?null:null==K(b)?H(J(b)):M(J(b),Ke(K(b)))};function Le(a){return Ac(a)}var Me=function Me(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Me.w();case 1:return Me.a(arguments[0]);case 2:return Me.b(arguments[0],arguments[1]);default:return Me.o(arguments[0],arguments[1],new jd(c.slice(2),0))}};
Me.w=function(){return yc(Pd)};Me.a=function(a){return a};Me.b=function(a,b){return zc(a,b)};Me.o=function(a,b,c){for(;;)if(a=zc(a,b),y(c))b=J(c),c=K(c);else return a};Me.G=function(a){var b=J(a),c=K(a);a=J(c);c=K(c);return Me.o(b,a,c)};Me.A=2;
function Ne(a,b,c){var d=H(c);if(0===b)return a.w?a.w():a.call(null);c=Qb(d);var e=Rb(d);if(1===b)return a.a?a.a(c):a.a?a.a(c):a.call(null,c);var d=Qb(e),f=Rb(e);if(2===b)return a.b?a.b(c,d):a.b?a.b(c,d):a.call(null,c,d);var e=Qb(f),g=Rb(f);if(3===b)return a.c?a.c(c,d,e):a.c?a.c(c,d,e):a.call(null,c,d,e);var f=Qb(g),k=Rb(g);if(4===b)return a.m?a.m(c,d,e,f):a.m?a.m(c,d,e,f):a.call(null,c,d,e,f);var g=Qb(k),l=Rb(k);if(5===b)return a.C?a.C(c,d,e,f,g):a.C?a.C(c,d,e,f,g):a.call(null,c,d,e,f,g);var k=Qb(l),
m=Rb(l);if(6===b)return a.V?a.V(c,d,e,f,g,k):a.V?a.V(c,d,e,f,g,k):a.call(null,c,d,e,f,g,k);var l=Qb(m),n=Rb(m);if(7===b)return a.W?a.W(c,d,e,f,g,k,l):a.W?a.W(c,d,e,f,g,k,l):a.call(null,c,d,e,f,g,k,l);var m=Qb(n),p=Rb(n);if(8===b)return a.na?a.na(c,d,e,f,g,k,l,m):a.na?a.na(c,d,e,f,g,k,l,m):a.call(null,c,d,e,f,g,k,l,m);var n=Qb(p),q=Rb(p);if(9===b)return a.oa?a.oa(c,d,e,f,g,k,l,m,n):a.oa?a.oa(c,d,e,f,g,k,l,m,n):a.call(null,c,d,e,f,g,k,l,m,n);var p=Qb(q),r=Rb(q);if(10===b)return a.ca?a.ca(c,d,e,f,g,
k,l,m,n,p):a.ca?a.ca(c,d,e,f,g,k,l,m,n,p):a.call(null,c,d,e,f,g,k,l,m,n,p);var q=Qb(r),t=Rb(r);if(11===b)return a.da?a.da(c,d,e,f,g,k,l,m,n,p,q):a.da?a.da(c,d,e,f,g,k,l,m,n,p,q):a.call(null,c,d,e,f,g,k,l,m,n,p,q);var r=Qb(t),v=Rb(t);if(12===b)return a.ea?a.ea(c,d,e,f,g,k,l,m,n,p,q,r):a.ea?a.ea(c,d,e,f,g,k,l,m,n,p,q,r):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r);var t=Qb(v),x=Rb(v);if(13===b)return a.fa?a.fa(c,d,e,f,g,k,l,m,n,p,q,r,t):a.fa?a.fa(c,d,e,f,g,k,l,m,n,p,q,r,t):a.call(null,c,d,e,f,g,k,l,m,n,p,q,
r,t);var v=Qb(x),A=Rb(x);if(14===b)return a.ga?a.ga(c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.ga?a.ga(c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v);var x=Qb(A),E=Rb(A);if(15===b)return a.ha?a.ha(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):a.ha?a.ha(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x);var A=Qb(E),I=Rb(E);if(16===b)return a.ia?a.ia(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):a.ia?a.ia(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A);var E=Qb(I),
S=Rb(I);if(17===b)return a.ja?a.ja(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E):a.ja?a.ja(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E);var I=Qb(S),pa=Rb(S);if(18===b)return a.ka?a.ka(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I):a.ka?a.ka(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I);S=Qb(pa);pa=Rb(pa);if(19===b)return a.la?a.la(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S):a.la?a.la(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S):a.call(null,c,d,e,f,g,k,
l,m,n,p,q,r,t,v,x,A,E,I,S);var z=Qb(pa);Rb(pa);if(20===b)return a.ma?a.ma(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S,z):a.ma?a.ma(c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S,z):a.call(null,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S,z);throw Error("Only up to 20 arguments supported on functions");}
var Ib=function Ib(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Ib.b(arguments[0],arguments[1]);case 3:return Ib.c(arguments[0],arguments[1],arguments[2]);case 4:return Ib.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Ib.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:return Ib.o(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],new jd(c.slice(5),0))}};
Ib.b=function(a,b){var c=a.A;if(a.G){var d=Je(b,c+1);return d<=c?Ne(a,d,b):a.G(b)}return a.apply(a,ke(b))};Ib.c=function(a,b,c){b=M(b,c);c=a.A;if(a.G){var d=Je(b,c+1);return d<=c?Ne(a,d,b):a.G(b)}return a.apply(a,ke(b))};Ib.m=function(a,b,c,d){b=M(b,M(c,d));c=a.A;return a.G?(d=Je(b,c+1),d<=c?Ne(a,d,b):a.G(b)):a.apply(a,ke(b))};Ib.C=function(a,b,c,d,e){b=M(b,M(c,M(d,e)));c=a.A;return a.G?(d=Je(b,c+1),d<=c?Ne(a,d,b):a.G(b)):a.apply(a,ke(b))};
Ib.o=function(a,b,c,d,e,f){b=M(b,M(c,M(d,M(e,Ke(f)))));c=a.A;return a.G?(d=Je(b,c+1),d<=c?Ne(a,d,b):a.G(b)):a.apply(a,ke(b))};Ib.G=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),e=K(d),d=J(e),f=K(e),e=J(f),f=K(f);return Ib.o(b,a,c,d,e,f)};Ib.A=5;
var Oe=function Oe(){"undefined"===typeof pb&&(pb=function(b,c){this.kd=b;this.hd=c;this.i=393216;this.B=0},pb.prototype.T=function(b,c){return new pb(this.kd,c)},pb.prototype.R=function(){return this.hd},pb.prototype.xa=function(){return!1},pb.prototype.next=function(){return Error("No such element")},pb.prototype.remove=function(){return Error("Unsupported operation")},pb.Dd=function(){return new P(null,2,5,Q,[yd(Pe,new w(null,1,[Qe,Wc(Re,Wc(Pd))],null)),ob.Bd],null)},pb.yc=!0,pb.Sb="cljs.core/t_cljs$core4826",
pb.bd=function(b){return vc(b,"cljs.core/t_cljs$core4826")});return new pb(Oe,Se)};Te;function Te(a,b,c,d){this.nb=a;this.first=b;this.ua=c;this.u=d;this.i=31719628;this.B=0}h=Te.prototype;h.T=function(a,b){return new Te(this.nb,this.first,this.ua,b)};h.U=function(a,b){return M(b,qc(this))};h.v=function(a,b){return null!=qc(this)?wd(this,b):Yd(b)&&null==H(b)};h.N=function(){return rd(this)};h.S=function(){null!=this.nb&&this.nb.step(this);return null==this.ua?null:this};
h.aa=function(){null!=this.nb&&qc(this);return null==this.ua?null:this.first};h.sa=function(){null!=this.nb&&qc(this);return null==this.ua?ld:this.ua};h.ra=function(){null!=this.nb&&qc(this);return null==this.ua?null:qc(this.ua)};Te.prototype[Gb]=function(){return nd(this)};function Ue(a,b){for(;;){if(null==H(b))return!0;var c;c=J(b);c=a.a?a.a(c):a.call(null,c);if(y(c)){c=a;var d=K(b);a=c;b=d}else return!1}}
function Ve(a){for(var b=me;;)if(H(a)){var c;c=J(a);c=b.a?b.a(c):b.call(null,c);if(y(c))return c;a=K(a)}else return null}var We=function We(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return We.w();case 1:return We.a(arguments[0]);case 2:return We.b(arguments[0],arguments[1]);case 3:return We.c(arguments[0],arguments[1],arguments[2]);default:return We.o(arguments[0],arguments[1],arguments[2],new jd(c.slice(3),0))}};We.w=function(){return me};
We.a=function(a){return a};
We.b=function(a,b){return function(){function c(c,d,e){c=b.c?b.c(c,d,e):b.call(null,c,d,e);return a.a?a.a(c):a.call(null,c)}function d(c,d){var e=b.b?b.b(c,d):b.call(null,c,d);return a.a?a.a(e):a.call(null,e)}function e(c){c=b.a?b.a(c):b.call(null,c);return a.a?a.a(c):a.call(null,c)}function f(){var c=b.w?b.w():b.call(null);return a.a?a.a(c):a.call(null,c)}var g=null,k=function(){function c(a,b,e,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+
3],++g;g=new jd(k,0)}return d.call(this,a,b,e,g)}function d(c,e,f,g){c=Ib.C(b,c,e,f,g);return a.a?a.a(c):a.call(null,c)}c.A=3;c.G=function(a){var b=J(a);a=K(a);var c=J(a);a=K(a);var e=J(a);a=kd(a);return d(b,c,e,a)};c.o=d;return c}(),g=function(a,b,g,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,g);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+
3],++q;q=new jd(r,0)}return k.o(a,b,g,q)}throw Error("Invalid arity: "+arguments.length);};g.A=3;g.G=k.G;g.w=f;g.a=e;g.b=d;g.c=c;g.o=k.o;return g}()};
We.c=function(a,b,c){return function(){function d(d,e,f){d=c.c?c.c(d,e,f):c.call(null,d,e,f);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function e(d,e){var f;f=c.b?c.b(d,e):c.call(null,d,e);f=b.a?b.a(f):b.call(null,f);return a.a?a.a(f):a.call(null,f)}function f(d){d=c.a?c.a(d):c.call(null,d);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function g(){var d;d=c.w?c.w():c.call(null);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}var k=null,l=function(){function d(a,
b,c,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+3],++g;g=new jd(k,0)}return e.call(this,a,b,c,g)}function e(d,f,g,k){d=Ib.C(c,d,f,g,k);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}d.A=3;d.G=function(a){var b=J(a);a=K(a);var c=J(a);a=K(a);var d=J(a);a=kd(a);return e(b,c,d,a)};d.o=e;return d}(),k=function(a,b,c,k){switch(arguments.length){case 0:return g.call(this);case 1:return f.call(this,a);case 2:return e.call(this,a,
b);case 3:return d.call(this,a,b,c);default:var r=null;if(3<arguments.length){for(var r=0,t=Array(arguments.length-3);r<t.length;)t[r]=arguments[r+3],++r;r=new jd(t,0)}return l.o(a,b,c,r)}throw Error("Invalid arity: "+arguments.length);};k.A=3;k.G=l.G;k.w=g;k.a=f;k.b=e;k.c=d;k.o=l.o;return k}()};
We.o=function(a,b,c,d){return function(a){return function(){function b(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new jd(e,0)}return c.call(this,d)}function c(b){b=Ib.b(J(a),b);for(var d=K(a);;)if(d)b=J(d).call(null,b),d=K(d);else return b}b.A=0;b.G=function(a){a=H(a);return c(a)};b.o=c;return b}()}(ze(M(a,M(b,M(c,d)))))};We.G=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),d=K(d);return We.o(b,a,c,d)};We.A=3;
function Xe(a,b){return function(){function c(c,d,e){return a.m?a.m(b,c,d,e):a.call(null,b,c,d,e)}function d(c,d){return a.c?a.c(b,c,d):a.call(null,b,c,d)}function e(c){return a.b?a.b(b,c):a.call(null,b,c)}function f(){return a.a?a.a(b):a.call(null,b)}var g=null,k=function(){function c(a,b,e,f){var g=null;if(3<arguments.length){for(var g=0,k=Array(arguments.length-3);g<k.length;)k[g]=arguments[g+3],++g;g=new jd(k,0)}return d.call(this,a,b,e,g)}function d(c,e,f,g){return Ib.o(a,b,c,e,f,hd([g],0))}
c.A=3;c.G=function(a){var b=J(a);a=K(a);var c=J(a);a=K(a);var e=J(a);a=kd(a);return d(b,c,e,a)};c.o=d;return c}(),g=function(a,b,g,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,g);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+3],++q;q=new jd(r,0)}return k.o(a,b,g,q)}throw Error("Invalid arity: "+arguments.length);};g.A=3;g.G=k.G;g.w=f;
g.a=e;g.b=d;g.c=c;g.o=k.o;return g}()}Ye;function Ze(a,b,c,d){this.state=a;this.u=b;this.pd=c;this.Kc=d;this.B=16386;this.i=6455296}h=Ze.prototype;h.equiv=function(a){return this.v(null,a)};h.v=function(a,b){return this===b};h.Pb=function(){return this.state};h.R=function(){return this.u};
h.wc=function(a,b,c){a=H(this.Kc);for(var d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);g.m?g.m(k,this,b,c):g.call(null,k,this,b,c);f+=1}else if(a=H(a))ce(a)?(d=Hc(a),a=Ic(a),k=d,e=N(d),d=k):(d=J(a),k=O(d,0),g=O(d,1),g.m?g.m(k,this,b,c):g.call(null,k,this,b,c),a=K(a),d=null,e=0),f=0;else return null};h.N=function(){return ka(this)};
var U=function U(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return U.a(arguments[0]);default:return U.o(arguments[0],new jd(c.slice(1),0))}};U.a=function(a){return new Ze(a,null,null,null)};U.o=function(a,b){var c=null!=b&&(b.i&64||b.hb)?Ib.b(vd,b):b,d=fd.b(c,xb),c=fd.b(c,$e);return new Ze(a,d,c,null)};U.G=function(a){var b=J(a);a=K(a);return U.o(b,a)};U.A=1;af;
function bf(a,b){if(a instanceof Ze){var c=a.pd;if(null!=c&&!y(c.a?c.a(b):c.call(null,b)))throw Error([F("Assert failed: "),F("Validator rejected reference state"),F("\n"),F(function(){var a=Wc(cf,df);return af.a?af.a(a):af.call(null,a)}())].join(""));c=a.state;a.state=b;null!=a.Kc&&xc(a,c,b);return b}return Mc(a,b)}
var ef=function ef(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ef.b(arguments[0],arguments[1]);case 3:return ef.c(arguments[0],arguments[1],arguments[2]);case 4:return ef.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return ef.o(arguments[0],arguments[1],arguments[2],arguments[3],new jd(c.slice(4),0))}};ef.b=function(a,b){var c;a instanceof Ze?(c=a.state,c=b.a?b.a(c):b.call(null,c),c=bf(a,c)):c=Nc.b(a,b);return c};
ef.c=function(a,b,c){if(a instanceof Ze){var d=a.state;b=b.b?b.b(d,c):b.call(null,d,c);a=bf(a,b)}else a=Nc.c(a,b,c);return a};ef.m=function(a,b,c,d){if(a instanceof Ze){var e=a.state;b=b.c?b.c(e,c,d):b.call(null,e,c,d);a=bf(a,b)}else a=Nc.m(a,b,c,d);return a};ef.o=function(a,b,c,d,e){return a instanceof Ze?bf(a,Ib.C(b,a.state,c,d,e)):Nc.C(a,b,c,d,e)};ef.G=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),e=K(d),d=J(e),e=K(e);return ef.o(b,a,c,d,e)};ef.A=4;
function ff(a){this.state=a;this.i=32768;this.B=0}ff.prototype.Pb=function(){return this.state};function Ye(a){return new ff(a)}
var se=function se(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return se.a(arguments[0]);case 2:return se.b(arguments[0],arguments[1]);case 3:return se.c(arguments[0],arguments[1],arguments[2]);case 4:return se.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:return se.o(arguments[0],arguments[1],arguments[2],arguments[3],new jd(c.slice(4),0))}};
se.a=function(a){return function(b){return function(){function c(c,d){var e=a.a?a.a(d):a.call(null,d);return b.b?b.b(c,e):b.call(null,c,e)}function d(a){return b.a?b.a(a):b.call(null,a)}function e(){return b.w?b.w():b.call(null)}var f=null,g=function(){function c(a,b,e){var f=null;if(2<arguments.length){for(var f=0,g=Array(arguments.length-2);f<g.length;)g[f]=arguments[f+2],++f;f=new jd(g,0)}return d.call(this,a,b,f)}function d(c,e,f){e=Ib.c(a,e,f);return b.b?b.b(c,e):b.call(null,c,e)}c.A=2;c.G=function(a){var b=
J(a);a=K(a);var c=J(a);a=kd(a);return d(b,c,a)};c.o=d;return c}(),f=function(a,b,f){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b);default:var n=null;if(2<arguments.length){for(var n=0,p=Array(arguments.length-2);n<p.length;)p[n]=arguments[n+2],++n;n=new jd(p,0)}return g.o(a,b,n)}throw Error("Invalid arity: "+arguments.length);};f.A=2;f.G=g.G;f.w=e;f.a=d;f.b=c;f.o=g.o;return f}()}};
se.b=function(a,b){return new De(null,function(){var c=H(b);if(c){if(ce(c)){for(var d=Hc(c),e=N(d),f=new Ge(Array(e),0),g=0;;)if(g<e)Ie(f,function(){var b=G.b(d,g);return a.a?a.a(b):a.call(null,b)}()),g+=1;else break;return He(f.Ia(),se.b(a,Ic(c)))}return M(function(){var b=J(c);return a.a?a.a(b):a.call(null,b)}(),se.b(a,kd(c)))}return null},null,null)};
se.c=function(a,b,c){return new De(null,function(){var d=H(b),e=H(c);if(d&&e){var f=M,g;g=J(d);var k=J(e);g=a.b?a.b(g,k):a.call(null,g,k);d=f(g,se.c(a,kd(d),kd(e)))}else d=null;return d},null,null)};se.m=function(a,b,c,d){return new De(null,function(){var e=H(b),f=H(c),g=H(d);if(e&&f&&g){var k=M,l;l=J(e);var m=J(f),n=J(g);l=a.c?a.c(l,m,n):a.call(null,l,m,n);e=k(l,se.m(a,kd(e),kd(f),kd(g)))}else e=null;return e},null,null)};
se.o=function(a,b,c,d,e){var f=function k(a){return new De(null,function(){var b=se.b(H,a);return Ue(me,b)?M(se.b(J,b),k(se.b(kd,b))):null},null,null)};return se.b(function(){return function(b){return Ib.b(a,b)}}(f),f(Od.o(e,d,hd([c,b],0))))};se.G=function(a){var b=J(a),c=K(a);a=J(c);var d=K(c),c=J(d),e=K(d),d=J(e),e=K(e);return se.o(b,a,c,d,e)};se.A=4;gf;
function hf(a,b){return new De(null,function(){var c=H(b);if(c){if(ce(c)){for(var d=Hc(c),e=N(d),f=new Ge(Array(e),0),g=0;;)if(g<e){var k;k=G.b(d,g);k=a.a?a.a(k):a.call(null,k);y(k)&&(k=G.b(d,g),f.add(k));g+=1}else break;return He(f.Ia(),hf(a,Ic(c)))}d=J(c);c=kd(c);return y(a.a?a.a(d):a.call(null,d))?M(d,hf(a,c)):hf(a,c)}return null},null,null)}
var jf=function jf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return jf.b(arguments[0],arguments[1]);case 3:return jf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};jf.b=function(a,b){return null!=a?null!=a&&(a.B&4||a.Oc)?yd(Le(Jb.c(zc,yc(a),b)),Wd(a)):Jb.c(Nb,a,b):Jb.c(Od,ld,b)};
jf.c=function(a,b,c){return null!=a&&(a.B&4||a.Oc)?yd(Le(ne(b,Me,yc(a),c)),Wd(a)):ne(b,Od,a,c)};jf.A=3;function kf(a,b){return Le(Jb.c(function(b,d){return Me.b(b,a.a?a.a(d):a.call(null,d))},yc(Pd),b))}function lf(a,b){var c;a:{c=fe;for(var d=a,e=H(b);;)if(e)if(null!=d?d.i&256||d.uc||(d.i?0:C(Tb,d)):C(Tb,d)){d=fd.c(d,J(e),c);if(c===d){c=null;break a}e=K(e)}else{c=null;break a}else{c=d;break a}}return c}
var mf=function mf(b,c,d){var e=O(c,0);c=re(c);return y(c)?Td.c(b,e,mf(fd.b(b,e),c,d)):Td.c(b,e,d)};function nf(a,b){this.M=a;this.f=b}function of(a){return new nf(a,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null])}function pf(a){return new nf(a.M,Hb(a.f))}function rf(a){a=a.j;return 32>a?0:a-1>>>5<<5}function sf(a,b,c){for(;;){if(0===b)return c;var d=of(a);d.f[0]=c;c=d;b-=5}}
var tf=function tf(b,c,d,e){var f=pf(d),g=b.j-1>>>c&31;5===c?f.f[g]=e:(d=d.f[g],b=null!=d?tf(b,c-5,d,e):sf(null,c-5,e),f.f[g]=b);return f};function uf(a,b){throw Error([F("No item "),F(a),F(" in vector of length "),F(b)].join(""));}function vf(a,b){if(b>=rf(a))return a.pa;for(var c=a.root,d=a.shift;;)if(0<d)var e=d-5,c=c.f[b>>>d&31],d=e;else return c.f}function wf(a,b){return 0<=b&&b<a.j?vf(a,b):uf(b,a.j)}
var xf=function xf(b,c,d,e,f){var g=pf(d);if(0===c)g.f[e&31]=f;else{var k=e>>>c&31;b=xf(b,c-5,d.f[k],e,f);g.f[k]=b}return g},yf=function yf(b,c,d){var e=b.j-2>>>c&31;if(5<c){b=yf(b,c-5,d.f[e]);if(null==b&&0===e)return null;d=pf(d);d.f[e]=b;return d}if(0===e)return null;d=pf(d);d.f[e]=null;return d};function zf(a,b,c,d,e,f){this.l=a;this.Mb=b;this.f=c;this.Ca=d;this.start=e;this.end=f}zf.prototype.xa=function(){return this.l<this.end};
zf.prototype.next=function(){32===this.l-this.Mb&&(this.f=vf(this.Ca,this.l),this.Mb+=32);var a=this.f[this.l&31];this.l+=1;return a};Af;Bf;Cf;L;Df;Ef;Ff;function P(a,b,c,d,e,f){this.u=a;this.j=b;this.shift=c;this.root=d;this.pa=e;this.s=f;this.i=167668511;this.B=8196}h=P.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
h.O=function(a,b){return wf(this,b)[b&31]};h.wa=function(a,b,c){return 0<=b&&b<this.j?vf(this,b)[b&31]:c};h.Ya=function(a,b,c){if(0<=b&&b<this.j)return rf(this)<=b?(a=Hb(this.pa),a[b&31]=c,new P(this.u,this.j,this.shift,this.root,a,null)):new P(this.u,this.j,this.shift,xf(this,this.shift,this.root,b,c),this.pa,null);if(b===this.j)return Nb(this,c);throw Error([F("Index "),F(b),F(" out of bounds  [0,"),F(this.j),F("]")].join(""));};
h.Ma=function(){var a=this.j;return new zf(0,0,0<N(this)?vf(this,0):null,this,0,a)};h.R=function(){return this.u};h.X=function(){return this.j};h.sb=function(){return G.b(this,0)};h.tb=function(){return G.b(this,1)};h.Wa=function(){return 0<this.j?G.b(this,this.j-1):null};
h.Xa=function(){if(0===this.j)throw Error("Can't pop empty vector");if(1===this.j)return jc(Pd,this.u);if(1<this.j-rf(this))return new P(this.u,this.j-1,this.shift,this.root,this.pa.slice(0,-1),null);var a=vf(this,this.j-2),b=yf(this,this.shift,this.root),b=null==b?Q:b,c=this.j-1;return 5<this.shift&&null==b.f[1]?new P(this.u,c,this.shift-5,b.f[0],a,null):new P(this.u,c,this.shift,b,a,null)};h.Rb=function(){return 0<this.j?new Hd(this,this.j-1,null):null};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){if(b instanceof P)if(this.j===N(b))for(var c=Oc(this),d=Oc(b);;)if(y(c.xa())){var e=c.next(),f=d.next();if(!Yc.b(e,f))return!1}else return!0;else return!1;else return wd(this,b)};h.gb=function(){return new Cf(this.j,this.shift,Af.a?Af.a(this.root):Af.call(null,this.root),Bf.a?Bf.a(this.pa):Bf.call(null,this.pa))};h.Z=function(a,b){return Bd(this,b)};
h.$=function(a,b,c){a=0;for(var d=c;;)if(a<this.j){var e=vf(this,a);c=e.length;a:for(var f=0;;)if(f<c){var g=e[f],d=b.b?b.b(d,g):b.call(null,d,g);if(Ad(d)){e=d;break a}f+=1}else{e=d;break a}if(Ad(e))return L.a?L.a(e):L.call(null,e);a+=c;d=e}else return d};h.Va=function(a,b,c){if("number"===typeof b)return fc(this,b,c);throw Error("Vector's key for assoc must be a number.");};
h.S=function(){if(0===this.j)return null;if(32>=this.j)return new jd(this.pa,0);var a;a:{a=this.root;for(var b=this.shift;;)if(0<b)b-=5,a=a.f[0];else{a=a.f;break a}}return Ff.m?Ff.m(this,a,0,0):Ff.call(null,this,a,0,0)};h.T=function(a,b){return new P(b,this.j,this.shift,this.root,this.pa,this.s)};
h.U=function(a,b){if(32>this.j-rf(this)){for(var c=this.pa.length,d=Array(c+1),e=0;;)if(e<c)d[e]=this.pa[e],e+=1;else break;d[c]=b;return new P(this.u,this.j+1,this.shift,this.root,d,null)}c=(d=this.j>>>5>1<<this.shift)?this.shift+5:this.shift;d?(d=of(null),d.f[0]=this.root,e=sf(null,this.shift,new nf(null,this.pa)),d.f[1]=e):d=tf(this,this.shift,this.root,new nf(null,this.pa));return new P(this.u,this.j+1,c,d,[b],null)};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.wa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.wa(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return this.O(null,a)};h.b=function(a,b){return this.wa(null,a,b)};
var Q=new nf(null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]),Pd=new P(null,0,5,Q,[],sd);P.prototype[Gb]=function(){return nd(this)};function le(a){if(Db(a))a:{var b=a.length;if(32>b)a=new P(null,b,5,Q,a,null);else for(var c=32,d=(new P(null,32,5,Q,a.slice(0,32),null)).gb(null);;)if(c<b)var e=c+1,d=Me.b(d,a[c]),c=e;else{a=Ac(d);break a}}else a=Ac(Jb.c(zc,yc(Pd),a));return a}Gf;
function be(a,b,c,d,e,f){this.Aa=a;this.node=b;this.l=c;this.ba=d;this.u=e;this.s=f;this.i=32375020;this.B=1536}h=be.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};h.ra=function(){if(this.ba+1<this.node.length){var a;a=this.Aa;var b=this.node,c=this.l,d=this.ba+1;a=Ff.m?Ff.m(a,b,c,d):Ff.call(null,a,b,c,d);return null==a?null:a}return Jc(this)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};
h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){var c;c=this.Aa;var d=this.l+this.ba,e=N(this.Aa);c=Gf.c?Gf.c(c,d,e):Gf.call(null,c,d,e);return Bd(c,b)};h.$=function(a,b,c){a=this.Aa;var d=this.l+this.ba,e=N(this.Aa);a=Gf.c?Gf.c(a,d,e):Gf.call(null,a,d,e);return Cd(a,b,c)};h.aa=function(){return this.node[this.ba]};h.sa=function(){if(this.ba+1<this.node.length){var a;a=this.Aa;var b=this.node,c=this.l,d=this.ba+1;a=Ff.m?Ff.m(a,b,c,d):Ff.call(null,a,b,c,d);return null==a?ld:a}return Ic(this)};
h.S=function(){return this};h.jc=function(){var a=this.node;return new Fe(a,this.ba,a.length)};h.kc=function(){var a=this.l+this.node.length;if(a<Lb(this.Aa)){var b=this.Aa,c=vf(this.Aa,a);return Ff.m?Ff.m(b,c,a,0):Ff.call(null,b,c,a,0)}return ld};h.T=function(a,b){return Ff.C?Ff.C(this.Aa,this.node,this.l,this.ba,b):Ff.call(null,this.Aa,this.node,this.l,this.ba,b)};h.U=function(a,b){return M(b,this)};
h.ic=function(){var a=this.l+this.node.length;if(a<Lb(this.Aa)){var b=this.Aa,c=vf(this.Aa,a);return Ff.m?Ff.m(b,c,a,0):Ff.call(null,b,c,a,0)}return null};be.prototype[Gb]=function(){return nd(this)};
var Ff=function Ff(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Ff.c(arguments[0],arguments[1],arguments[2]);case 4:return Ff.m(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Ff.C(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Ff.c=function(a,b,c){return new be(a,wf(a,b),b,c,null,null)};
Ff.m=function(a,b,c,d){return new be(a,b,c,d,null,null)};Ff.C=function(a,b,c,d,e){return new be(a,b,c,d,e,null)};Ff.A=5;Hf;function If(a,b,c,d,e){this.u=a;this.Ca=b;this.start=c;this.end=d;this.s=e;this.i=167666463;this.B=8192}h=If.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
h.O=function(a,b){return 0>b||this.end<=this.start+b?uf(b,this.end-this.start):G.b(this.Ca,this.start+b)};h.wa=function(a,b,c){return 0>b||this.end<=this.start+b?c:G.c(this.Ca,this.start+b,c)};h.Ya=function(a,b,c){var d=this.start+b;a=this.u;c=Td.c(this.Ca,d,c);b=this.start;var e=this.end,d=d+1,d=e>d?e:d;return Hf.C?Hf.C(a,c,b,d,null):Hf.call(null,a,c,b,d,null)};h.R=function(){return this.u};h.X=function(){return this.end-this.start};h.Wa=function(){return G.b(this.Ca,this.end-1)};
h.Xa=function(){if(this.start===this.end)throw Error("Can't pop empty vector");var a=this.u,b=this.Ca,c=this.start,d=this.end-1;return Hf.C?Hf.C(a,b,c,d,null):Hf.call(null,a,b,c,d,null)};h.Rb=function(){return this.start!==this.end?new Hd(this,this.end-this.start-1,null):null};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Bd(this,b)};h.$=function(a,b,c){return Cd(this,b,c)};
h.Va=function(a,b,c){if("number"===typeof b)return fc(this,b,c);throw Error("Subvec's key for assoc must be a number.");};h.S=function(){var a=this;return function(b){return function d(e){return e===a.end?null:M(G.b(a.Ca,e),new De(null,function(){return function(){return d(e+1)}}(b),null,null))}}(this)(a.start)};h.T=function(a,b){return Hf.C?Hf.C(b,this.Ca,this.start,this.end,this.s):Hf.call(null,b,this.Ca,this.start,this.end,this.s)};
h.U=function(a,b){var c=this.u,d=fc(this.Ca,this.end,b),e=this.start,f=this.end+1;return Hf.C?Hf.C(c,d,e,f,null):Hf.call(null,c,d,e,f,null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.wa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.wa(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};
h.a=function(a){return this.O(null,a)};h.b=function(a,b){return this.wa(null,a,b)};If.prototype[Gb]=function(){return nd(this)};function Hf(a,b,c,d,e){for(;;)if(b instanceof If)c=b.start+c,d=b.start+d,b=b.Ca;else{var f=N(b);if(0>c||0>d||c>f||d>f)throw Error("Index out of bounds");return new If(a,b,c,d,e)}}
var Gf=function Gf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Gf.b(arguments[0],arguments[1]);case 3:return Gf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Gf.b=function(a,b){return Gf.c(a,b,N(a))};Gf.c=function(a,b,c){return Hf(null,a,b,c,null)};Gf.A=3;function Jf(a,b){return a===b.M?b:new nf(a,Hb(b.f))}function Af(a){return new nf({},Hb(a.f))}
function Bf(a){var b=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];ee(a,0,b,0,a.length);return b}var Kf=function Kf(b,c,d,e){d=Jf(b.root.M,d);var f=b.j-1>>>c&31;if(5===c)b=e;else{var g=d.f[f];b=null!=g?Kf(b,c-5,g,e):sf(b.root.M,c-5,e)}d.f[f]=b;return d};function Cf(a,b,c,d){this.j=a;this.shift=b;this.root=c;this.pa=d;this.B=88;this.i=275}h=Cf.prototype;
h.xb=function(a,b){if(this.root.M){if(32>this.j-rf(this))this.pa[this.j&31]=b;else{var c=new nf(this.root.M,this.pa),d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];d[0]=b;this.pa=d;if(this.j>>>5>1<<this.shift){var d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],e=this.shift+
5;d[0]=this.root;d[1]=sf(this.root.M,this.shift,c);this.root=new nf(this.root.M,d);this.shift=e}else this.root=Kf(this,this.shift,this.root,c)}this.j+=1;return this}throw Error("conj! after persistent!");};h.yb=function(){if(this.root.M){this.root.M=null;var a=this.j-rf(this),b=Array(a);ee(this.pa,0,b,0,a);return new P(null,this.j,this.shift,this.root,b,null)}throw Error("persistent! called twice");};
h.wb=function(a,b,c){if("number"===typeof b)return Cc(this,b,c);throw Error("TransientVector's key for assoc! must be a number.");};
h.vc=function(a,b,c){var d=this;if(d.root.M){if(0<=b&&b<d.j)return rf(this)<=b?d.pa[b&31]=c:(a=function(){return function f(a,k){var l=Jf(d.root.M,k);if(0===a)l.f[b&31]=c;else{var m=b>>>a&31,n=f(a-5,l.f[m]);l.f[m]=n}return l}}(this).call(null,d.shift,d.root),d.root=a),this;if(b===d.j)return zc(this,c);throw Error([F("Index "),F(b),F(" out of bounds for TransientVector of length"),F(d.j)].join(""));}throw Error("assoc! after persistent!");};
h.X=function(){if(this.root.M)return this.j;throw Error("count after persistent!");};h.O=function(a,b){if(this.root.M)return wf(this,b)[b&31];throw Error("nth after persistent!");};h.wa=function(a,b,c){return 0<=b&&b<this.j?G.b(this,b):c};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){return"number"===typeof b?G.c(this,b,c):c};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};function Lf(){this.i=2097152;this.B=0}
Lf.prototype.equiv=function(a){return this.v(null,a)};Lf.prototype.v=function(){return!1};var Mf=new Lf;function Nf(a,b){return he(Zd(b)?N(a)===N(b)?Ue(me,se.b(function(a){return Yc.b(fd.c(b,J(a),Mf),Nd(a))},a)):null:null)}function Of(a){this.D=a}Of.prototype.next=function(){if(null!=this.D){var a=J(this.D),b=O(a,0),a=O(a,1);this.D=K(this.D);return{value:[b,a],done:!1}}return{value:null,done:!0}};function Pf(a){return new Of(H(a))}function Qf(a){this.D=a}
Qf.prototype.next=function(){if(null!=this.D){var a=J(this.D);this.D=K(this.D);return{value:[a,a],done:!1}}return{value:null,done:!0}};
function Rf(a,b){var c;if(b instanceof B)a:{c=a.length;for(var d=b.Ja,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof B&&d===a[e].Ja){c=e;break a}e+=2}}else if(ha(b)||"number"===typeof b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(b===a[d]){c=d;break a}d+=2}else if(b instanceof Xc)a:for(c=a.length,d=b.La,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof Xc&&d===a[e].La){c=e;break a}e+=2}else if(null==b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(null==a[d]){c=d;break a}d+=2}else a:for(c=a.length,
d=0;;){if(c<=d){c=-1;break a}if(Yc.b(b,a[d])){c=d;break a}d+=2}return c}Sf;function Tf(a,b,c){this.f=a;this.l=b;this.Ba=c;this.i=32374990;this.B=0}h=Tf.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){return this.l<this.f.length-2?new Tf(this.f,this.l+2,this.Ba):null};h.X=function(){return(this.f.length-this.l)/2};h.N=function(){return rd(this)};h.v=function(a,b){return wd(this,b)};
h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return new P(null,2,5,Q,[this.f[this.l],this.f[this.l+1]],null)};h.sa=function(){return this.l<this.f.length-2?new Tf(this.f,this.l+2,this.Ba):ld};h.S=function(){return this};h.T=function(a,b){return new Tf(this.f,this.l,b)};h.U=function(a,b){return M(b,this)};Tf.prototype[Gb]=function(){return nd(this)};Uf;Vf;function Wf(a,b,c){this.f=a;this.l=b;this.j=c}Wf.prototype.xa=function(){return this.l<this.j};
Wf.prototype.next=function(){var a=new P(null,2,5,Q,[this.f[this.l],this.f[this.l+1]],null);this.l+=2;return a};function w(a,b,c,d){this.u=a;this.j=b;this.f=c;this.s=d;this.i=16647951;this.B=8196}h=w.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.keys=function(){return nd(Uf.a?Uf.a(this):Uf.call(null,this))};h.entries=function(){return Pf(H(this))};h.values=function(){return nd(Vf.a?Vf.a(this):Vf.call(null,this))};h.has=function(a){return ie(this,a)};
h.get=function(a,b){return this.H(null,a,b)};h.forEach=function(a){for(var b=H(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=O(f,0),f=O(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=H(b))ce(b)?(c=Hc(b),b=Ic(b),g=c,d=N(c),c=g):(c=J(b),g=O(c,0),f=O(c,1),a.b?a.b(f,g):a.call(null,f,g),b=K(b),c=null,d=0),e=0;else return null};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){a=Rf(this.f,b);return-1===a?c:this.f[a+1]};h.Ma=function(){return new Wf(this.f,0,2*this.j)};h.R=function(){return this.u};
h.X=function(){return this.j};h.N=function(){var a=this.s;return null!=a?a:this.s=a=td(this)};h.v=function(a,b){if(null!=b&&(b.i&1024||b.Rc)){var c=this.f.length;if(this.j===b.X(null))for(var d=0;;)if(d<c){var e=b.H(null,this.f[d],fe);if(e!==fe)if(Yc.b(this.f[d+1],e))d+=2;else return!1;else return!1}else return!0;else return!1}else return Nf(this,b)};h.gb=function(){return new Sf({},this.f.length,Hb(this.f))};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};
h.Va=function(a,b,c){a=Rf(this.f,b);if(-1===a){if(this.j<Xf){a=this.f;for(var d=a.length,e=Array(d+2),f=0;;)if(f<d)e[f]=a[f],f+=1;else break;e[d]=b;e[d+1]=c;return new w(this.u,this.j+1,e,null)}return jc(Xb(jf.b(Ud,this),b,c),this.u)}if(c===this.f[a+1])return this;b=Hb(this.f);b[a+1]=c;return new w(this.u,this.j,b,null)};h.hc=function(a,b){return-1!==Rf(this.f,b)};h.S=function(){var a=this.f;return 0<=a.length-2?new Tf(a,0,null):null};h.T=function(a,b){return new w(b,this.j,this.f,this.s)};
h.U=function(a,b){if($d(b))return Xb(this,G.b(b,0),G.b(b,1));for(var c=this,d=H(b);;){if(null==d)return c;var e=J(d);if($d(e))c=Xb(c,G.b(e,0),G.b(e,1)),d=K(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};var Se=new w(null,0,[],ud),Xf=8;w.prototype[Gb]=function(){return nd(this)};
Yf;function Sf(a,b,c){this.ib=a;this.bb=b;this.f=c;this.i=258;this.B=56}h=Sf.prototype;h.X=function(){if(y(this.ib))return pe(this.bb);throw Error("count after persistent!");};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){if(y(this.ib))return a=Rf(this.f,b),-1===a?c:this.f[a+1];throw Error("lookup after persistent!");};
h.xb=function(a,b){if(y(this.ib)){if(null!=b?b.i&2048||b.Sc||(b.i?0:C(Zb,b)):C(Zb,b))return Bc(this,ue.a?ue.a(b):ue.call(null,b),ve.a?ve.a(b):ve.call(null,b));for(var c=H(b),d=this;;){var e=J(c);if(y(e))c=K(c),d=Bc(d,ue.a?ue.a(e):ue.call(null,e),ve.a?ve.a(e):ve.call(null,e));else return d}}else throw Error("conj! after persistent!");};h.yb=function(){if(y(this.ib))return this.ib=!1,new w(null,pe(this.bb),this.f,null);throw Error("persistent! called twice");};
h.wb=function(a,b,c){if(y(this.ib)){a=Rf(this.f,b);if(-1===a){if(this.bb+2<=2*Xf)return this.bb+=2,this.f.push(b),this.f.push(c),this;a=Yf.b?Yf.b(this.bb,this.f):Yf.call(null,this.bb,this.f);return Bc(a,b,c)}c!==this.f[a+1]&&(this.f[a+1]=c);return this}throw Error("assoc! after persistent!");};Zf;Sd;function Yf(a,b){for(var c=yc(Ud),d=0;;)if(d<a)c=Bc(c,b[d],b[d+1]),d+=2;else return c}function $f(){this.J=!1}ag;bg;bf;cg;U;L;
function dg(a,b){return a===b?!0:a===b||a instanceof B&&b instanceof B&&a.Ja===b.Ja?!0:Yc.b(a,b)}function eg(a,b,c){a=Hb(a);a[b]=c;return a}function fg(a,b,c,d){a=a.Za(b);a.f[c]=d;return a}gg;function hg(a,b,c,d){this.f=a;this.l=b;this.Jb=c;this.Ha=d}hg.prototype.advance=function(){for(var a=this.f.length;;)if(this.l<a){var b=this.f[this.l],c=this.f[this.l+1];null!=b?b=this.Jb=new P(null,2,5,Q,[b,c],null):null!=c?(b=Oc(c),b=b.xa()?this.Ha=b:!1):b=!1;this.l+=2;if(b)return!0}else return!1};
hg.prototype.xa=function(){var a=null!=this.Jb;return a?a:(a=null!=this.Ha)?a:this.advance()};hg.prototype.next=function(){if(null!=this.Jb){var a=this.Jb;this.Jb=null;return a}if(null!=this.Ha)return a=this.Ha.next(),this.Ha.xa()||(this.Ha=null),a;if(this.advance())return this.next();throw Error("No such element");};hg.prototype.remove=function(){return Error("Unsupported operation")};function ig(a,b,c){this.M=a;this.Y=b;this.f=c}h=ig.prototype;
h.Za=function(a){if(a===this.M)return this;var b=qe(this.Y),c=Array(0>b?4:2*(b+1));ee(this.f,0,c,0,2*b);return new ig(a,this.Y,c)};h.Fb=function(){return ag.a?ag.a(this.f):ag.call(null,this.f)};h.Ta=function(a,b,c,d){var e=1<<(b>>>a&31);if(0===(this.Y&e))return d;var f=qe(this.Y&e-1),e=this.f[2*f],f=this.f[2*f+1];return null==e?f.Ta(a+5,b,c,d):dg(c,e)?f:d};
h.Fa=function(a,b,c,d,e,f){var g=1<<(c>>>b&31),k=qe(this.Y&g-1);if(0===(this.Y&g)){var l=qe(this.Y);if(2*l<this.f.length){a=this.Za(a);b=a.f;f.J=!0;a:for(c=2*(l-k),f=2*k+(c-1),l=2*(k+1)+(c-1);;){if(0===c)break a;b[l]=b[f];--l;--c;--f}b[2*k]=d;b[2*k+1]=e;a.Y|=g;return a}if(16<=l){k=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];k[c>>>b&31]=jg.Fa(a,b+5,c,d,e,f);for(e=d=0;;)if(32>d)0!==
(this.Y>>>d&1)&&(k[d]=null!=this.f[e]?jg.Fa(a,b+5,cd(this.f[e]),this.f[e],this.f[e+1],f):this.f[e+1],e+=2),d+=1;else break;return new gg(a,l+1,k)}b=Array(2*(l+4));ee(this.f,0,b,0,2*k);b[2*k]=d;b[2*k+1]=e;ee(this.f,2*k,b,2*(k+1),2*(l-k));f.J=!0;a=this.Za(a);a.f=b;a.Y|=g;return a}l=this.f[2*k];g=this.f[2*k+1];if(null==l)return l=g.Fa(a,b+5,c,d,e,f),l===g?this:fg(this,a,2*k+1,l);if(dg(d,l))return e===g?this:fg(this,a,2*k+1,e);f.J=!0;f=b+5;d=cg.W?cg.W(a,f,l,g,c,d,e):cg.call(null,a,f,l,g,c,d,e);e=2*k;
k=2*k+1;a=this.Za(a);a.f[e]=null;a.f[k]=d;return a};
h.Ea=function(a,b,c,d,e){var f=1<<(b>>>a&31),g=qe(this.Y&f-1);if(0===(this.Y&f)){var k=qe(this.Y);if(16<=k){g=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];g[b>>>a&31]=jg.Ea(a+5,b,c,d,e);for(d=c=0;;)if(32>c)0!==(this.Y>>>c&1)&&(g[c]=null!=this.f[d]?jg.Ea(a+5,cd(this.f[d]),this.f[d],this.f[d+1],e):this.f[d+1],d+=2),c+=1;else break;return new gg(null,k+1,g)}a=Array(2*(k+1));ee(this.f,
0,a,0,2*g);a[2*g]=c;a[2*g+1]=d;ee(this.f,2*g,a,2*(g+1),2*(k-g));e.J=!0;return new ig(null,this.Y|f,a)}var l=this.f[2*g],f=this.f[2*g+1];if(null==l)return k=f.Ea(a+5,b,c,d,e),k===f?this:new ig(null,this.Y,eg(this.f,2*g+1,k));if(dg(c,l))return d===f?this:new ig(null,this.Y,eg(this.f,2*g+1,d));e.J=!0;e=this.Y;k=this.f;a+=5;a=cg.V?cg.V(a,l,f,b,c,d):cg.call(null,a,l,f,b,c,d);c=2*g;g=2*g+1;d=Hb(k);d[c]=null;d[g]=a;return new ig(null,e,d)};h.Ma=function(){return new hg(this.f,0,null,null)};
var jg=new ig(null,0,[]);function kg(a,b,c){this.f=a;this.l=b;this.Ha=c}kg.prototype.xa=function(){for(var a=this.f.length;;){if(null!=this.Ha&&this.Ha.xa())return!0;if(this.l<a){var b=this.f[this.l];this.l+=1;null!=b&&(this.Ha=Oc(b))}else return!1}};kg.prototype.next=function(){if(this.xa())return this.Ha.next();throw Error("No such element");};kg.prototype.remove=function(){return Error("Unsupported operation")};function gg(a,b,c){this.M=a;this.j=b;this.f=c}h=gg.prototype;
h.Za=function(a){return a===this.M?this:new gg(a,this.j,Hb(this.f))};h.Fb=function(){return bg.a?bg.a(this.f):bg.call(null,this.f)};h.Ta=function(a,b,c,d){var e=this.f[b>>>a&31];return null!=e?e.Ta(a+5,b,c,d):d};h.Fa=function(a,b,c,d,e,f){var g=c>>>b&31,k=this.f[g];if(null==k)return a=fg(this,a,g,jg.Fa(a,b+5,c,d,e,f)),a.j+=1,a;b=k.Fa(a,b+5,c,d,e,f);return b===k?this:fg(this,a,g,b)};
h.Ea=function(a,b,c,d,e){var f=b>>>a&31,g=this.f[f];if(null==g)return new gg(null,this.j+1,eg(this.f,f,jg.Ea(a+5,b,c,d,e)));a=g.Ea(a+5,b,c,d,e);return a===g?this:new gg(null,this.j,eg(this.f,f,a))};h.Ma=function(){return new kg(this.f,0,null)};function lg(a,b,c){b*=2;for(var d=0;;)if(d<b){if(dg(c,a[d]))return d;d+=2}else return-1}function mg(a,b,c,d){this.M=a;this.Sa=b;this.j=c;this.f=d}h=mg.prototype;
h.Za=function(a){if(a===this.M)return this;var b=Array(2*(this.j+1));ee(this.f,0,b,0,2*this.j);return new mg(a,this.Sa,this.j,b)};h.Fb=function(){return ag.a?ag.a(this.f):ag.call(null,this.f)};h.Ta=function(a,b,c,d){a=lg(this.f,this.j,c);return 0>a?d:dg(c,this.f[a])?this.f[a+1]:d};
h.Fa=function(a,b,c,d,e,f){if(c===this.Sa){b=lg(this.f,this.j,d);if(-1===b){if(this.f.length>2*this.j)return b=2*this.j,c=2*this.j+1,a=this.Za(a),a.f[b]=d,a.f[c]=e,f.J=!0,a.j+=1,a;c=this.f.length;b=Array(c+2);ee(this.f,0,b,0,c);b[c]=d;b[c+1]=e;f.J=!0;d=this.j+1;a===this.M?(this.f=b,this.j=d,a=this):a=new mg(this.M,this.Sa,d,b);return a}return this.f[b+1]===e?this:fg(this,a,b+1,e)}return(new ig(a,1<<(this.Sa>>>b&31),[null,this,null,null])).Fa(a,b,c,d,e,f)};
h.Ea=function(a,b,c,d,e){return b===this.Sa?(a=lg(this.f,this.j,c),-1===a?(a=2*this.j,b=Array(a+2),ee(this.f,0,b,0,a),b[a]=c,b[a+1]=d,e.J=!0,new mg(null,this.Sa,this.j+1,b)):Yc.b(this.f[a],d)?this:new mg(null,this.Sa,this.j,eg(this.f,a+1,d))):(new ig(null,1<<(this.Sa>>>a&31),[null,this])).Ea(a,b,c,d,e)};h.Ma=function(){return new hg(this.f,0,null,null)};
var cg=function cg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 6:return cg.V(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);case 7:return cg.W(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5],arguments[6]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
cg.V=function(a,b,c,d,e,f){var g=cd(b);if(g===d)return new mg(null,g,2,[b,c,e,f]);var k=new $f;return jg.Ea(a,g,b,c,k).Ea(a,d,e,f,k)};cg.W=function(a,b,c,d,e,f,g){var k=cd(c);if(k===e)return new mg(null,k,2,[c,d,f,g]);var l=new $f;return jg.Fa(a,b,k,c,d,l).Fa(a,b,e,f,g,l)};cg.A=7;function ng(a,b,c,d,e){this.u=a;this.Ua=b;this.l=c;this.D=d;this.s=e;this.i=32374860;this.B=0}h=ng.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return null==this.D?new P(null,2,5,Q,[this.Ua[this.l],this.Ua[this.l+1]],null):J(this.D)};h.sa=function(){if(null==this.D){var a=this.Ua,b=this.l+2;return ag.c?ag.c(a,b,null):ag.call(null,a,b,null)}var a=this.Ua,b=this.l,c=K(this.D);return ag.c?ag.c(a,b,c):ag.call(null,a,b,c)};h.S=function(){return this};
h.T=function(a,b){return new ng(b,this.Ua,this.l,this.D,this.s)};h.U=function(a,b){return M(b,this)};ng.prototype[Gb]=function(){return nd(this)};var ag=function ag(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return ag.a(arguments[0]);case 3:return ag.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};ag.a=function(a){return ag.c(a,0,null)};
ag.c=function(a,b,c){if(null==c)for(c=a.length;;)if(b<c){if(null!=a[b])return new ng(null,a,b,null,null);var d=a[b+1];if(y(d)&&(d=d.Fb(),y(d)))return new ng(null,a,b+2,d,null);b+=2}else return null;else return new ng(null,a,b,c,null)};ag.A=3;function og(a,b,c,d,e){this.u=a;this.Ua=b;this.l=c;this.D=d;this.s=e;this.i=32374860;this.B=0}h=og.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.u};
h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};h.aa=function(){return J(this.D)};h.sa=function(){var a=this.Ua,b=this.l,c=K(this.D);return bg.m?bg.m(null,a,b,c):bg.call(null,null,a,b,c)};h.S=function(){return this};h.T=function(a,b){return new og(b,this.Ua,this.l,this.D,this.s)};h.U=function(a,b){return M(b,this)};og.prototype[Gb]=function(){return nd(this)};
var bg=function bg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return bg.a(arguments[0]);case 4:return bg.m(arguments[0],arguments[1],arguments[2],arguments[3]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};bg.a=function(a){return bg.m(null,a,0,null)};
bg.m=function(a,b,c,d){if(null==d)for(d=b.length;;)if(c<d){var e=b[c];if(y(e)&&(e=e.Fb(),y(e)))return new og(a,b,c+1,e,null);c+=1}else return null;else return new og(a,b,c,d,null)};bg.A=4;Zf;function pg(a,b,c){this.za=a;this.Hc=b;this.qc=c}pg.prototype.xa=function(){return this.qc&&this.Hc.xa()};pg.prototype.next=function(){if(this.qc)return this.Hc.next();this.qc=!0;return this.za};pg.prototype.remove=function(){return Error("Unsupported operation")};
function Sd(a,b,c,d,e,f){this.u=a;this.j=b;this.root=c;this.ya=d;this.za=e;this.s=f;this.i=16123663;this.B=8196}h=Sd.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.keys=function(){return nd(Uf.a?Uf.a(this):Uf.call(null,this))};h.entries=function(){return Pf(H(this))};h.values=function(){return nd(Vf.a?Vf.a(this):Vf.call(null,this))};h.has=function(a){return ie(this,a)};h.get=function(a,b){return this.H(null,a,b)};
h.forEach=function(a){for(var b=H(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=O(f,0),f=O(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=H(b))ce(b)?(c=Hc(b),b=Ic(b),g=c,d=N(c),c=g):(c=J(b),g=O(c,0),f=O(c,1),a.b?a.b(f,g):a.call(null,f,g),b=K(b),c=null,d=0),e=0;else return null};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){return null==b?this.ya?this.za:c:null==this.root?c:this.root.Ta(0,cd(b),b,c)};
h.Ma=function(){var a=this.root?Oc(this.root):Oe;return this.ya?new pg(this.za,a,!1):a};h.R=function(){return this.u};h.X=function(){return this.j};h.N=function(){var a=this.s;return null!=a?a:this.s=a=td(this)};h.v=function(a,b){return Nf(this,b)};h.gb=function(){return new Zf({},this.root,this.j,this.ya,this.za)};
h.Va=function(a,b,c){if(null==b)return this.ya&&c===this.za?this:new Sd(this.u,this.ya?this.j:this.j+1,this.root,!0,c,null);a=new $f;b=(null==this.root?jg:this.root).Ea(0,cd(b),b,c,a);return b===this.root?this:new Sd(this.u,a.J?this.j+1:this.j,b,this.ya,this.za,null)};h.hc=function(a,b){return null==b?this.ya:null==this.root?!1:this.root.Ta(0,cd(b),b,fe)!==fe};h.S=function(){if(0<this.j){var a=null!=this.root?this.root.Fb():null;return this.ya?M(new P(null,2,5,Q,[null,this.za],null),a):a}return null};
h.T=function(a,b){return new Sd(b,this.j,this.root,this.ya,this.za,this.s)};h.U=function(a,b){if($d(b))return Xb(this,G.b(b,0),G.b(b,1));for(var c=this,d=H(b);;){if(null==d)return c;var e=J(d);if($d(e))c=Xb(c,G.b(e,0),G.b(e,1)),d=K(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};var Ud=new Sd(null,0,null,!1,null,ud);Sd.prototype[Gb]=function(){return nd(this)};
function Zf(a,b,c,d,e){this.M=a;this.root=b;this.count=c;this.ya=d;this.za=e;this.i=258;this.B=56}function qg(a,b,c){if(a.M){if(null==b)a.za!==c&&(a.za=c),a.ya||(a.count+=1,a.ya=!0);else{var d=new $f;b=(null==a.root?jg:a.root).Fa(a.M,0,cd(b),b,c,d);b!==a.root&&(a.root=b);d.J&&(a.count+=1)}return a}throw Error("assoc! after persistent!");}h=Zf.prototype;h.X=function(){if(this.M)return this.count;throw Error("count after persistent!");};
h.K=function(a,b){return null==b?this.ya?this.za:null:null==this.root?null:this.root.Ta(0,cd(b),b)};h.H=function(a,b,c){return null==b?this.ya?this.za:c:null==this.root?c:this.root.Ta(0,cd(b),b,c)};
h.xb=function(a,b){var c;a:if(this.M)if(null!=b?b.i&2048||b.Sc||(b.i?0:C(Zb,b)):C(Zb,b))c=qg(this,ue.a?ue.a(b):ue.call(null,b),ve.a?ve.a(b):ve.call(null,b));else{c=H(b);for(var d=this;;){var e=J(c);if(y(e))c=K(c),d=qg(d,ue.a?ue.a(e):ue.call(null,e),ve.a?ve.a(e):ve.call(null,e));else{c=d;break a}}}else throw Error("conj! after persistent");return c};h.yb=function(){var a;if(this.M)this.M=null,a=new Sd(null,this.count,this.root,this.ya,this.za,null);else throw Error("persistent! called twice");return a};
h.wb=function(a,b,c){return qg(this,b,c)};rg;sg;function sg(a,b,c,d,e){this.key=a;this.J=b;this.left=c;this.right=d;this.s=e;this.i=32402207;this.B=0}h=sg.prototype;h.replace=function(a,b,c,d){return new sg(a,b,c,d,null)};h.K=function(a,b){return G.c(this,b,null)};h.H=function(a,b,c){return G.c(this,b,c)};h.O=function(a,b){return 0===b?this.key:1===b?this.J:null};h.wa=function(a,b,c){return 0===b?this.key:1===b?this.J:c};
h.Ya=function(a,b,c){return(new P(null,2,5,Q,[this.key,this.J],null)).Ya(null,b,c)};h.R=function(){return null};h.X=function(){return 2};h.sb=function(){return this.key};h.tb=function(){return this.J};h.Wa=function(){return this.J};h.Xa=function(){return new P(null,1,5,Q,[this.key],null)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Bd(this,b)};h.$=function(a,b,c){return Cd(this,b,c)};
h.Va=function(a,b,c){return Td.c(new P(null,2,5,Q,[this.key,this.J],null),b,c)};h.S=function(){return Nb(Nb(ld,this.J),this.key)};h.T=function(a,b){return yd(new P(null,2,5,Q,[this.key,this.J],null),b)};h.U=function(a,b){return new P(null,3,5,Q,[this.key,this.J,b],null)};
h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};sg.prototype[Gb]=function(){return nd(this)};
function rg(a,b,c,d,e){this.key=a;this.J=b;this.left=c;this.right=d;this.s=e;this.i=32402207;this.B=0}h=rg.prototype;h.replace=function(a,b,c,d){return new rg(a,b,c,d,null)};h.K=function(a,b){return G.c(this,b,null)};h.H=function(a,b,c){return G.c(this,b,c)};h.O=function(a,b){return 0===b?this.key:1===b?this.J:null};h.wa=function(a,b,c){return 0===b?this.key:1===b?this.J:c};h.Ya=function(a,b,c){return(new P(null,2,5,Q,[this.key,this.J],null)).Ya(null,b,c)};h.R=function(){return null};h.X=function(){return 2};
h.sb=function(){return this.key};h.tb=function(){return this.J};h.Wa=function(){return this.J};h.Xa=function(){return new P(null,1,5,Q,[this.key],null)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Bd(this,b)};h.$=function(a,b,c){return Cd(this,b,c)};h.Va=function(a,b,c){return Td.c(new P(null,2,5,Q,[this.key,this.J],null),b,c)};h.S=function(){return Nb(Nb(ld,this.J),this.key)};
h.T=function(a,b){return yd(new P(null,2,5,Q,[this.key,this.J],null),b)};h.U=function(a,b){return new P(null,3,5,Q,[this.key,this.J,b],null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};
h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};rg.prototype[Gb]=function(){return nd(this)};ue;var vd=function vd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return vd.o(0<c.length?new jd(c.slice(0),0):null)};vd.o=function(a){for(var b=H(a),c=yc(Ud);;)if(b){a=K(K(b));var d=J(b),b=Nd(b),c=Bc(c,d,b),b=a}else return Ac(c)};vd.A=0;vd.G=function(a){return vd.o(H(a))};
function tg(a,b){this.F=a;this.Ba=b;this.i=32374988;this.B=0}h=tg.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Sb,this.F)):C(Sb,this.F))?this.F.ra(null):K(this.F);return null==a?null:new tg(a,this.Ba)};h.N=function(){return rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};
h.aa=function(){return this.F.aa(null).sb(null)};h.sa=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Sb,this.F)):C(Sb,this.F))?this.F.ra(null):K(this.F);return null!=a?new tg(a,this.Ba):ld};h.S=function(){return this};h.T=function(a,b){return new tg(this.F,b)};h.U=function(a,b){return M(b,this)};tg.prototype[Gb]=function(){return nd(this)};function Uf(a){return(a=H(a))?new tg(a,null):null}function ue(a){return $b(a)}
function ug(a,b){this.F=a;this.Ba=b;this.i=32374988;this.B=0}h=ug.prototype;h.toString=function(){return Qc(this)};h.equiv=function(a){return this.v(null,a)};h.R=function(){return this.Ba};h.ra=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Sb,this.F)):C(Sb,this.F))?this.F.ra(null):K(this.F);return null==a?null:new ug(a,this.Ba)};h.N=function(){return rd(this)};h.v=function(a,b){return wd(this,b)};h.Z=function(a,b){return Md.b(b,this)};h.$=function(a,b,c){return Md.c(b,c,this)};
h.aa=function(){return this.F.aa(null).tb(null)};h.sa=function(){var a=(null!=this.F?this.F.i&128||this.F.Qb||(this.F.i?0:C(Sb,this.F)):C(Sb,this.F))?this.F.ra(null):K(this.F);return null!=a?new ug(a,this.Ba):ld};h.S=function(){return this};h.T=function(a,b){return new ug(this.F,b)};h.U=function(a,b){return M(b,this)};ug.prototype[Gb]=function(){return nd(this)};function Vf(a){return(a=H(a))?new ug(a,null):null}function ve(a){return ac(a)}
function vg(a){return y(Ve(a))?Jb.b(function(a,c){return Od.b(y(a)?a:Se,c)},a):null}wg;function xg(a){this.kb=a}xg.prototype.xa=function(){return this.kb.xa()};xg.prototype.next=function(){if(this.kb.xa())return this.kb.next().pa[0];throw Error("No such element");};xg.prototype.remove=function(){return Error("Unsupported operation")};function yg(a,b,c){this.u=a;this.$a=b;this.s=c;this.i=15077647;this.B=8196}h=yg.prototype;h.toString=function(){return Qc(this)};
h.equiv=function(a){return this.v(null,a)};h.keys=function(){return nd(H(this))};h.entries=function(){var a=H(this);return new Qf(H(a))};h.values=function(){return nd(H(this))};h.has=function(a){return ie(this,a)};h.forEach=function(a){for(var b=H(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),g=O(f,0),f=O(f,1);a.b?a.b(f,g):a.call(null,f,g);e+=1}else if(b=H(b))ce(b)?(c=Hc(b),b=Ic(b),g=c,d=N(c),c=g):(c=J(b),g=O(c,0),f=O(c,1),a.b?a.b(f,g):a.call(null,f,g),b=K(b),c=null,d=0),e=0;else return null};
h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){return Vb(this.$a,b)?b:c};h.Ma=function(){return new xg(Oc(this.$a))};h.R=function(){return this.u};h.X=function(){return Lb(this.$a)};h.N=function(){var a=this.s;return null!=a?a:this.s=a=td(this)};h.v=function(a,b){return Xd(b)&&N(this)===N(b)&&Ue(function(a){return function(b){return ie(a,b)}}(this),b)};h.gb=function(){return new wg(yc(this.$a))};h.S=function(){return Uf(this.$a)};h.T=function(a,b){return new yg(b,this.$a,this.s)};
h.U=function(a,b){return new yg(this.u,Td.c(this.$a,b,null),null)};h.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.K(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.K(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return this.K(null,a)};h.b=function(a,b){return this.H(null,a,b)};
yg.prototype[Gb]=function(){return nd(this)};function wg(a){this.Pa=a;this.B=136;this.i=259}h=wg.prototype;h.xb=function(a,b){this.Pa=Bc(this.Pa,b,null);return this};h.yb=function(){return new yg(null,Ac(this.Pa),null)};h.X=function(){return N(this.Pa)};h.K=function(a,b){return Ub.c(this,b,null)};h.H=function(a,b,c){return Ub.c(this.Pa,b,fe)===fe?c:b};
h.call=function(){function a(a,b,c){return Ub.c(this.Pa,b,fe)===fe?c:b}function b(a,b){return Ub.c(this.Pa,b,fe)===fe?null:b}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,c,e);case 3:return a.call(this,c,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};h.a=function(a){return Ub.c(this.Pa,a,fe)===fe?null:a};h.b=function(a,b){return Ub.c(this.Pa,a,fe)===fe?b:a};
function te(a){if(null!=a&&(a.B&4096||a.Uc))return a.ub(null);if("string"===typeof a)return a;throw Error([F("Doesn't support name: "),F(a)].join(""));}function zg(a,b){if("string"===typeof b){var c=a.exec(b);return Yc.b(J(c),b)?1===N(c)?J(c):le(c):null}throw new TypeError("re-matches must match against a string.");}
function Df(a,b,c,d,e,f,g){var k=sb;sb=null==sb?null:sb-1;try{if(null!=sb&&0>sb)return vc(a,"#");vc(a,c);if(0===zb.a(f))H(g)&&vc(a,function(){var a=Ag.a(f);return y(a)?a:"..."}());else{if(H(g)){var l=J(g);b.c?b.c(l,a,f):b.call(null,l,a,f)}for(var m=K(g),n=zb.a(f)-1;;)if(!m||null!=n&&0===n){H(m)&&0===n&&(vc(a,d),vc(a,function(){var a=Ag.a(f);return y(a)?a:"..."}()));break}else{vc(a,d);var p=J(m);c=a;g=f;b.c?b.c(p,c,g):b.call(null,p,c,g);var q=K(m);c=n-1;m=q;n=c}}return vc(a,e)}finally{sb=k}}
function Bg(a,b){for(var c=H(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f);vc(a,g);f+=1}else if(c=H(c))d=c,ce(d)?(c=Hc(d),e=Ic(d),d=c,g=N(c),c=e,e=g):(g=J(d),vc(a,g),c=K(d),d=null,e=0),f=0;else return null}var Cg={'"':'\\"',"\\":"\\\\","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t"};function Dg(a){return[F('"'),F(a.replace(RegExp('[\\\\"\b\f\n\r\t]',"g"),function(a){return Cg[a]})),F('"')].join("")}Eg;
function Fg(a,b){var c=he(fd.b(a,xb));return c?(c=null!=b?b.i&131072||b.Tc?!0:!1:!1)?null!=Wd(b):c:c}
function Gg(a,b,c){if(null==a)return vc(b,"nil");if(Fg(c,a)){vc(b,"^");var d=Wd(a);Ef.c?Ef.c(d,b,c):Ef.call(null,d,b,c);vc(b," ")}if(a.yc)return a.bd(b);if(null!=a&&(a.i&2147483648||a.P))return a.L(null,b,c);if(!0===a||!1===a||"number"===typeof a)return vc(b,""+F(a));if(null!=a&&a.constructor===Object)return vc(b,"#js "),d=se.b(function(b){return new P(null,2,5,Q,[Ce.a(b),a[b]],null)},de(a)),Eg.m?Eg.m(d,Ef,b,c):Eg.call(null,d,Ef,b,c);if(Db(a))return Df(b,Ef,"#js ["," ","]",c,a);if(ha(a))return y(wb.a(c))?
vc(b,Dg(a)):vc(b,a);if(ia(a)){var e=a.name;c=y(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Function":e;return Bg(b,hd(["#object[",c,' "',""+F(a),'"]'],0))}if(a instanceof Date)return c=function(a,b){for(var c=""+F(a);;)if(N(c)<b)c=[F("0"),F(c)].join("");else return c},Bg(b,hd(['#inst "',""+F(a.getUTCFullYear()),"-",c(a.getUTCMonth()+1,2),"-",c(a.getUTCDate(),2),"T",c(a.getUTCHours(),2),":",c(a.getUTCMinutes(),2),":",c(a.getUTCSeconds(),2),".",c(a.getUTCMilliseconds(),3),"-",'00:00"'],
0));if(a instanceof RegExp)return Bg(b,hd(['#"',a.source,'"'],0));if(null!=a&&(a.i&2147483648||a.P))return wc(a,b,c);if(y(a.constructor.Sb))return Bg(b,hd(["#object[",a.constructor.Sb.replace(RegExp("/","g"),"."),"]"],0));e=a.constructor.name;c=y(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Object":e;return Bg(b,hd(["#object[",c," ",""+F(a),"]"],0))}function Ef(a,b,c){var d=Hg.a(c);return y(d)?(c=Td.c(c,Ig,Gg),d.c?d.c(a,b,c):d.call(null,a,b,c)):Gg(a,b,c)}
var af=function af(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return af.o(0<c.length?new jd(c.slice(0),0):null)};af.o=function(a){var b=ub();if(null==a||Eb(H(a)))b="";else{var c=F,d=new nb;a:{var e=new Pc(d);Ef(J(a),e,b);a=H(K(a));for(var f=null,g=0,k=0;;)if(k<g){var l=f.O(null,k);vc(e," ");Ef(l,e,b);k+=1}else if(a=H(a))f=a,ce(f)?(a=Hc(f),g=Ic(f),f=a,l=N(a),a=g,g=l):(l=J(f),vc(e," "),Ef(l,e,b),a=K(f),f=null,g=0),k=0;else break a}b=""+c(d)}return b};af.A=0;
af.G=function(a){return af.o(H(a))};function Eg(a,b,c,d){return Df(c,function(a,c,d){var k=$b(a);b.c?b.c(k,c,d):b.call(null,k,c,d);vc(c," ");a=ac(a);return b.c?b.c(a,c,d):b.call(null,a,c,d)},"{",", ","}",d,H(a))}ff.prototype.P=!0;ff.prototype.L=function(a,b,c){vc(b,"#object [cljs.core.Volatile ");Ef(new w(null,1,[Jg,this.state],null),b,c);return vc(b,"]")};jd.prototype.P=!0;jd.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};De.prototype.P=!0;
De.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};ng.prototype.P=!0;ng.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};sg.prototype.P=!0;sg.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};Tf.prototype.P=!0;Tf.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};pd.prototype.P=!0;pd.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};be.prototype.P=!0;be.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};
Ae.prototype.P=!0;Ae.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Hd.prototype.P=!0;Hd.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Sd.prototype.P=!0;Sd.prototype.L=function(a,b,c){return Eg(this,Ef,b,c)};og.prototype.P=!0;og.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};If.prototype.P=!0;If.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};yg.prototype.P=!0;yg.prototype.L=function(a,b,c){return Df(b,Ef,"#{"," ","}",c,this)};
ae.prototype.P=!0;ae.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Ze.prototype.P=!0;Ze.prototype.L=function(a,b,c){vc(b,"#object [cljs.core.Atom ");Ef(new w(null,1,[Jg,this.state],null),b,c);return vc(b,"]")};ug.prototype.P=!0;ug.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};rg.prototype.P=!0;rg.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};P.prototype.P=!0;P.prototype.L=function(a,b,c){return Df(b,Ef,"["," ","]",c,this)};ye.prototype.P=!0;
ye.prototype.L=function(a,b){return vc(b,"()")};Te.prototype.P=!0;Te.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};w.prototype.P=!0;w.prototype.L=function(a,b,c){return Eg(this,Ef,b,c)};tg.prototype.P=!0;tg.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Id.prototype.P=!0;Id.prototype.L=function(a,b,c){return Df(b,Ef,"("," ",")",c,this)};Xc.prototype.qb=!0;
Xc.prototype.fb=function(a,b){if(b instanceof Xc)return ed(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};B.prototype.qb=!0;B.prototype.fb=function(a,b){if(b instanceof B)return Be(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};If.prototype.qb=!0;If.prototype.fb=function(a,b){if($d(b))return je(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};P.prototype.qb=!0;
P.prototype.fb=function(a,b){if($d(b))return je(this,b);throw Error([F("Cannot compare "),F(this),F(" to "),F(b)].join(""));};function Kg(a){return function(b,c){var d=a.b?a.b(b,c):a.call(null,b,c);return Ad(d)?new zd(d):d}}
function gf(a){return function(b){return function(){function c(a,c){return Jb.c(b,a,c)}function d(b){return a.a?a.a(b):a.call(null,b)}function e(){return a.w?a.w():a.call(null)}var f=null,f=function(a,b){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b)}throw Error("Invalid arity: "+arguments.length);};f.w=e;f.a=d;f.b=c;return f}()}(Kg(a))}Lg;function Mg(){}
var Ng=function Ng(b){if(null!=b&&null!=b.Qc)return b.Qc(b);var c=Ng[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Ng._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("IEncodeJS.-clj-\x3ejs",b);};Og;function Pg(a){return(null!=a?a.Pc||(a.zb?0:C(Mg,a)):C(Mg,a))?Ng(a):"string"===typeof a||"number"===typeof a||a instanceof B||a instanceof Xc?Og.a?Og.a(a):Og.call(null,a):af.o(hd([a],0))}
var Og=function Og(b){if(null==b)return null;if(null!=b?b.Pc||(b.zb?0:C(Mg,b)):C(Mg,b))return Ng(b);if(b instanceof B)return te(b);if(b instanceof Xc)return""+F(b);if(Zd(b)){var c={};b=H(b);for(var d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);c[Pg(k)]=Og(g);f+=1}else if(b=H(b))ce(b)?(e=Hc(b),b=Ic(b),d=e,e=N(e)):(e=J(b),d=O(e,0),e=O(e,1),c[Pg(d)]=Og(e),b=K(b),d=null,e=0),f=0;else break;return c}if(null==b?0:null!=b?b.i&8||b.sd||(b.i?0:C(Mb,b)):C(Mb,b)){c=[];b=H(se.b(Og,b));d=null;for(f=
e=0;;)if(f<e)k=d.O(null,f),c.push(k),f+=1;else if(b=H(b))d=b,ce(d)?(b=Hc(d),f=Ic(d),d=b,e=N(b),b=f):(b=J(d),c.push(b),b=K(d),d=null,e=0),f=0;else break;return c}return b},Lg=function Lg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return Lg.w();case 1:return Lg.a(arguments[0]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};Lg.w=function(){return Lg.a(1)};Lg.a=function(a){return Math.random()*a};Lg.A=1;var Qg=null;
function Rg(){if(null==Qg){var a=new w(null,3,[Sg,Se,Tg,Se,Ug,Se],null);Qg=U.a?U.a(a):U.call(null,a)}return Qg}function Vg(a,b,c){var d=Yc.b(b,c);if(!d&&!(d=ie(Ug.a(a).call(null,b),c))&&(d=$d(c))&&(d=$d(b)))if(d=N(c)===N(b))for(var d=!0,e=0;;)if(d&&e!==N(c))d=Vg(a,b.a?b.a(e):b.call(null,e),c.a?c.a(e):c.call(null,e)),e+=1;else return d;else return d;else return d}function Wg(a){var b;b=Rg();b=L.a?L.a(b):L.call(null,b);a=fd.b(Sg.a(b),a);return H(a)?a:null}
function Xg(a,b,c,d){ef.b(a,function(){return L.a?L.a(b):L.call(null,b)});ef.b(c,function(){return L.a?L.a(d):L.call(null,d)})}var Yg=function Yg(b,c,d){var e=(L.a?L.a(d):L.call(null,d)).call(null,b),e=y(y(e)?e.a?e.a(c):e.call(null,c):e)?!0:null;if(y(e))return e;e=function(){for(var e=Wg(c);;)if(0<N(e))Yg(b,J(e),d),e=kd(e);else return null}();if(y(e))return e;e=function(){for(var e=Wg(b);;)if(0<N(e))Yg(J(e),c,d),e=kd(e);else return null}();return y(e)?e:!1};
function Zg(a,b,c){c=Yg(a,b,c);if(y(c))a=c;else{c=Vg;var d;d=Rg();d=L.a?L.a(d):L.call(null,d);a=c(d,a,b)}return a}
var $g=function $g(b,c,d,e,f,g,k){var l=Jb.c(function(e,g){var k=O(g,0);O(g,1);if(Vg(L.a?L.a(d):L.call(null,d),c,k)){var l;l=(l=null==e)?l:Zg(k,J(e),f);l=y(l)?g:e;if(!y(Zg(J(l),k,f)))throw Error([F("Multiple methods in multimethod '"),F(b),F("' match dispatch value: "),F(c),F(" -\x3e "),F(k),F(" and "),F(J(l)),F(", and neither is preferred")].join(""));return l}return e},null,L.a?L.a(e):L.call(null,e));if(y(l)){if(Yc.b(L.a?L.a(k):L.call(null,k),L.a?L.a(d):L.call(null,d)))return ef.m(g,Td,c,Nd(l)),
Nd(l);Xg(g,e,k,d);return $g(b,c,d,e,f,g,k)}return null};function W(a,b){throw Error([F("No method in multimethod '"),F(a),F("' for dispatch value: "),F(b)].join(""));}function ah(a,b,c,d,e,f,g,k){this.name=a;this.h=b;this.gd=c;this.Eb=d;this.lb=e;this.nd=f;this.Ib=g;this.ob=k;this.i=4194305;this.B=4352}h=ah.prototype;
h.call=function(){function a(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I,S){a=this;var pa=Ib.o(a.h,b,c,d,e,hd([f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I,S],0)),uh=X(this,pa);y(uh)||W(a.name,pa);return Ib.o(uh,b,c,d,e,hd([f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I,S],0))}function b(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I){a=this;var S=a.h.ma?a.h.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I),pa=X(this,S);y(pa)||W(a.name,S);return pa.ma?pa.ma(b,c,d,e,f,g,k,l,m,n,p,q,r,
t,v,x,A,z,E,I):pa.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E,I)}function c(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E){a=this;var I=a.h.la?a.h.la(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E),S=X(this,I);y(S)||W(a.name,I);return S.la?S.la(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E):S.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z,E)}function d(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z){a=this;var E=a.h.ka?a.h.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z):a.h.call(null,
b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z),I=X(this,E);y(I)||W(a.name,E);return I.ka?I.ka(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z):I.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,z)}function e(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A){a=this;var z=a.h.ja?a.h.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A),E=X(this,z);y(E)||W(a.name,z);return E.ja?E.ja(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):E.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A)}function f(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,
x){a=this;var A=a.h.ia?a.h.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x),z=X(this,A);y(z)||W(a.name,A);return z.ia?z.ia(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):z.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x)}function g(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){a=this;var x=a.h.ha?a.h.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v),A=X(this,x);y(A)||W(a.name,x);return A.ha?A.ha(b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):A.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)}
function k(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){a=this;var v=a.h.ga?a.h.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,t):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t),x=X(this,v);y(x)||W(a.name,v);return x.ga?x.ga(b,c,d,e,f,g,k,l,m,n,p,q,r,t):x.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r,t)}function l(a,b,c,d,e,f,g,k,l,m,n,p,q,r){a=this;var t=a.h.fa?a.h.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q,r),v=X(this,t);y(v)||W(a.name,t);return v.fa?v.fa(b,c,d,e,f,g,k,l,m,n,p,q,r):v.call(null,b,c,d,e,f,g,k,l,m,n,p,
q,r)}function m(a,b,c,d,e,f,g,k,l,m,n,p,q){a=this;var r=a.h.ea?a.h.ea(b,c,d,e,f,g,k,l,m,n,p,q):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p,q),t=X(this,r);y(t)||W(a.name,r);return t.ea?t.ea(b,c,d,e,f,g,k,l,m,n,p,q):t.call(null,b,c,d,e,f,g,k,l,m,n,p,q)}function n(a,b,c,d,e,f,g,k,l,m,n,p){a=this;var q=a.h.da?a.h.da(b,c,d,e,f,g,k,l,m,n,p):a.h.call(null,b,c,d,e,f,g,k,l,m,n,p),r=X(this,q);y(r)||W(a.name,q);return r.da?r.da(b,c,d,e,f,g,k,l,m,n,p):r.call(null,b,c,d,e,f,g,k,l,m,n,p)}function p(a,b,c,d,e,f,g,k,l,m,
n){a=this;var p=a.h.ca?a.h.ca(b,c,d,e,f,g,k,l,m,n):a.h.call(null,b,c,d,e,f,g,k,l,m,n),q=X(this,p);y(q)||W(a.name,p);return q.ca?q.ca(b,c,d,e,f,g,k,l,m,n):q.call(null,b,c,d,e,f,g,k,l,m,n)}function q(a,b,c,d,e,f,g,k,l,m){a=this;var n=a.h.oa?a.h.oa(b,c,d,e,f,g,k,l,m):a.h.call(null,b,c,d,e,f,g,k,l,m),p=X(this,n);y(p)||W(a.name,n);return p.oa?p.oa(b,c,d,e,f,g,k,l,m):p.call(null,b,c,d,e,f,g,k,l,m)}function r(a,b,c,d,e,f,g,k,l){a=this;var m=a.h.na?a.h.na(b,c,d,e,f,g,k,l):a.h.call(null,b,c,d,e,f,g,k,l),n=
X(this,m);y(n)||W(a.name,m);return n.na?n.na(b,c,d,e,f,g,k,l):n.call(null,b,c,d,e,f,g,k,l)}function t(a,b,c,d,e,f,g,k){a=this;var l=a.h.W?a.h.W(b,c,d,e,f,g,k):a.h.call(null,b,c,d,e,f,g,k),m=X(this,l);y(m)||W(a.name,l);return m.W?m.W(b,c,d,e,f,g,k):m.call(null,b,c,d,e,f,g,k)}function v(a,b,c,d,e,f,g){a=this;var k=a.h.V?a.h.V(b,c,d,e,f,g):a.h.call(null,b,c,d,e,f,g),l=X(this,k);y(l)||W(a.name,k);return l.V?l.V(b,c,d,e,f,g):l.call(null,b,c,d,e,f,g)}function x(a,b,c,d,e,f){a=this;var g=a.h.C?a.h.C(b,c,
d,e,f):a.h.call(null,b,c,d,e,f),k=X(this,g);y(k)||W(a.name,g);return k.C?k.C(b,c,d,e,f):k.call(null,b,c,d,e,f)}function A(a,b,c,d,e){a=this;var f=a.h.m?a.h.m(b,c,d,e):a.h.call(null,b,c,d,e),g=X(this,f);y(g)||W(a.name,f);return g.m?g.m(b,c,d,e):g.call(null,b,c,d,e)}function E(a,b,c,d){a=this;var e=a.h.c?a.h.c(b,c,d):a.h.call(null,b,c,d),f=X(this,e);y(f)||W(a.name,e);return f.c?f.c(b,c,d):f.call(null,b,c,d)}function I(a,b,c){a=this;var d=a.h.b?a.h.b(b,c):a.h.call(null,b,c),e=X(this,d);y(e)||W(a.name,
d);return e.b?e.b(b,c):e.call(null,b,c)}function S(a,b){a=this;var c=a.h.a?a.h.a(b):a.h.call(null,b),d=X(this,c);y(d)||W(a.name,c);return d.a?d.a(b):d.call(null,b)}function pa(a){a=this;var b=a.h.w?a.h.w():a.h.call(null),c=X(this,b);y(c)||W(a.name,b);return c.w?c.w():c.call(null)}var z=null,z=function(z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib,Bb,Wb,Ec,xd,qf){switch(arguments.length){case 1:return pa.call(this,z);case 2:return S.call(this,z,R);case 3:return I.call(this,z,R,T);case 4:return E.call(this,
z,R,T,V);case 5:return A.call(this,z,R,T,V,Z);case 6:return x.call(this,z,R,T,V,Z,ba);case 7:return v.call(this,z,R,T,V,Z,ba,ga);case 8:return t.call(this,z,R,T,V,Z,ba,ga,ja);case 9:return r.call(this,z,R,T,V,Z,ba,ga,ja,ma);case 10:return q.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa);case 11:return p.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua);case 12:return n.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za);case 13:return m.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia);case 14:return l.call(this,z,R,T,V,Z,ba,ga,ja,ma,
oa,ua,za,Ia,Ma);case 15:return k.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc);case 16:return g.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa);case 17:return f.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib);case 18:return e.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib,Bb);case 19:return d.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib,Bb,Wb);case 20:return c.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib,Bb,Wb,Ec);case 21:return b.call(this,z,R,T,
V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib,Bb,Wb,Ec,xd);case 22:return a.call(this,z,R,T,V,Z,ba,ga,ja,ma,oa,ua,za,Ia,Ma,kc,Wa,ib,Bb,Wb,Ec,xd,qf)}throw Error("Invalid arity: "+arguments.length);};z.a=pa;z.b=S;z.c=I;z.m=E;z.C=A;z.V=x;z.W=v;z.na=t;z.oa=r;z.ca=q;z.da=p;z.ea=n;z.fa=m;z.ga=l;z.ha=k;z.ia=g;z.ja=f;z.ka=e;z.la=d;z.ma=c;z.lc=b;z.rb=a;return z}();h.apply=function(a,b){return this.call.apply(this,[this].concat(Hb(b)))};
h.w=function(){var a=this.h.w?this.h.w():this.h.call(null),b=X(this,a);y(b)||W(this.name,a);return b.w?b.w():b.call(null)};h.a=function(a){var b=this.h.a?this.h.a(a):this.h.call(null,a),c=X(this,b);y(c)||W(this.name,b);return c.a?c.a(a):c.call(null,a)};h.b=function(a,b){var c=this.h.b?this.h.b(a,b):this.h.call(null,a,b),d=X(this,c);y(d)||W(this.name,c);return d.b?d.b(a,b):d.call(null,a,b)};
h.c=function(a,b,c){var d=this.h.c?this.h.c(a,b,c):this.h.call(null,a,b,c),e=X(this,d);y(e)||W(this.name,d);return e.c?e.c(a,b,c):e.call(null,a,b,c)};h.m=function(a,b,c,d){var e=this.h.m?this.h.m(a,b,c,d):this.h.call(null,a,b,c,d),f=X(this,e);y(f)||W(this.name,e);return f.m?f.m(a,b,c,d):f.call(null,a,b,c,d)};h.C=function(a,b,c,d,e){var f=this.h.C?this.h.C(a,b,c,d,e):this.h.call(null,a,b,c,d,e),g=X(this,f);y(g)||W(this.name,f);return g.C?g.C(a,b,c,d,e):g.call(null,a,b,c,d,e)};
h.V=function(a,b,c,d,e,f){var g=this.h.V?this.h.V(a,b,c,d,e,f):this.h.call(null,a,b,c,d,e,f),k=X(this,g);y(k)||W(this.name,g);return k.V?k.V(a,b,c,d,e,f):k.call(null,a,b,c,d,e,f)};h.W=function(a,b,c,d,e,f,g){var k=this.h.W?this.h.W(a,b,c,d,e,f,g):this.h.call(null,a,b,c,d,e,f,g),l=X(this,k);y(l)||W(this.name,k);return l.W?l.W(a,b,c,d,e,f,g):l.call(null,a,b,c,d,e,f,g)};
h.na=function(a,b,c,d,e,f,g,k){var l=this.h.na?this.h.na(a,b,c,d,e,f,g,k):this.h.call(null,a,b,c,d,e,f,g,k),m=X(this,l);y(m)||W(this.name,l);return m.na?m.na(a,b,c,d,e,f,g,k):m.call(null,a,b,c,d,e,f,g,k)};h.oa=function(a,b,c,d,e,f,g,k,l){var m=this.h.oa?this.h.oa(a,b,c,d,e,f,g,k,l):this.h.call(null,a,b,c,d,e,f,g,k,l),n=X(this,m);y(n)||W(this.name,m);return n.oa?n.oa(a,b,c,d,e,f,g,k,l):n.call(null,a,b,c,d,e,f,g,k,l)};
h.ca=function(a,b,c,d,e,f,g,k,l,m){var n=this.h.ca?this.h.ca(a,b,c,d,e,f,g,k,l,m):this.h.call(null,a,b,c,d,e,f,g,k,l,m),p=X(this,n);y(p)||W(this.name,n);return p.ca?p.ca(a,b,c,d,e,f,g,k,l,m):p.call(null,a,b,c,d,e,f,g,k,l,m)};h.da=function(a,b,c,d,e,f,g,k,l,m,n){var p=this.h.da?this.h.da(a,b,c,d,e,f,g,k,l,m,n):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n),q=X(this,p);y(q)||W(this.name,p);return q.da?q.da(a,b,c,d,e,f,g,k,l,m,n):q.call(null,a,b,c,d,e,f,g,k,l,m,n)};
h.ea=function(a,b,c,d,e,f,g,k,l,m,n,p){var q=this.h.ea?this.h.ea(a,b,c,d,e,f,g,k,l,m,n,p):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p),r=X(this,q);y(r)||W(this.name,q);return r.ea?r.ea(a,b,c,d,e,f,g,k,l,m,n,p):r.call(null,a,b,c,d,e,f,g,k,l,m,n,p)};h.fa=function(a,b,c,d,e,f,g,k,l,m,n,p,q){var r=this.h.fa?this.h.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q),t=X(this,r);y(t)||W(this.name,r);return t.fa?t.fa(a,b,c,d,e,f,g,k,l,m,n,p,q):t.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q)};
h.ga=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r){var t=this.h.ga?this.h.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r),v=X(this,t);y(v)||W(this.name,t);return v.ga?v.ga(a,b,c,d,e,f,g,k,l,m,n,p,q,r):v.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r)};
h.ha=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t){var v=this.h.ha?this.h.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t),x=X(this,v);y(x)||W(this.name,v);return x.ha?x.ha(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t):x.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t)};
h.ia=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v){var x=this.h.ia?this.h.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v),A=X(this,x);y(A)||W(this.name,x);return A.ia?A.ia(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v):A.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v)};
h.ja=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x){var A=this.h.ja?this.h.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x),E=X(this,A);y(E)||W(this.name,A);return E.ja?E.ja(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x):E.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x)};
h.ka=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A){var E=this.h.ka?this.h.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A),I=X(this,E);y(I)||W(this.name,E);return I.ka?I.ka(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A):I.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A)};
h.la=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E){var I=this.h.la?this.h.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E),S=X(this,I);y(S)||W(this.name,I);return S.la?S.la(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E):S.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E)};
h.ma=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I){var S=this.h.ma?this.h.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I):this.h.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I),pa=X(this,S);y(pa)||W(this.name,S);return pa.ma?pa.ma(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I):pa.call(null,a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I)};
h.lc=function(a,b,c,d,e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S){var pa=Ib.o(this.h,a,b,c,d,hd([e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S],0)),z=X(this,pa);y(z)||W(this.name,pa);return Ib.o(z,a,b,c,d,hd([e,f,g,k,l,m,n,p,q,r,t,v,x,A,E,I,S],0))};function bh(a,b){var c=ch;ef.m(c.lb,Td,a,b);Xg(c.Ib,c.lb,c.ob,c.Eb)}
function X(a,b){Yc.b(L.a?L.a(a.ob):L.call(null,a.ob),L.a?L.a(a.Eb):L.call(null,a.Eb))||Xg(a.Ib,a.lb,a.ob,a.Eb);var c=(L.a?L.a(a.Ib):L.call(null,a.Ib)).call(null,b);if(y(c))return c;c=$g(a.name,b,a.Eb,a.lb,a.nd,a.Ib,a.ob);return y(c)?c:(L.a?L.a(a.lb):L.call(null,a.lb)).call(null,a.gd)}h.ub=function(){return Kc(this.name)};h.vb=function(){return Lc(this.name)};h.N=function(){return ka(this)};var dh=new B(null,"orders","orders",-1032870176),eh=new B(null,"from-date","from-date",1469949792),fh=new B(null,"date","date",-1463434462),gh=new B(null,"remove","remove",-131428414),xb=new B(null,"meta","meta",1499536964),hh=new B(null,"color","color",1011675173),yb=new B(null,"dup","dup",556298533),ih=new B(null,"couriers","couriers",-1702205146),df=new Xc(null,"new-value","new-value",-1567397401,null),$e=new B(null,"validator","validator",-1966190681),jh=new B(null,"to-date","to-date",500848648),
kh=new B(null,"default","default",-1987822328),lh=new B(null,"name","name",1843675177),mh=new B(null,"value","value",305978217),nh=new B(null,"accepted","accepted",-1953464374),oh=new B(null,"coll","coll",1647737163),Jg=new B(null,"val","val",128701612),ph=new B(null,"type","type",1174270348),cf=new Xc(null,"validate","validate",1439230700,null),Ig=new B(null,"fallback-impl","fallback-impl",-1501286995),vb=new B(null,"flush-on-newline","flush-on-newline",-151457939),Tg=new B(null,"descendants","descendants",
1824886031),qh=new B(null,"title","title",636505583),Ug=new B(null,"ancestors","ancestors",-776045424),rh=new B(null,"style","style",-496642736),sh=new B(null,"cancelled","cancelled",488726224),th=new B(null,"div","div",1057191632),wb=new B(null,"readably","readably",1129599760),Ag=new B(null,"more-marker","more-marker",-14717935),vh=new B(null,"google-map","google-map",1960730035),wh=new B(null,"status","status",-1997798413),zb=new B(null,"print-length","print-length",1931866356),xh=new B(null,"unassigned",
"unassigned",-1438879244),yh=new B(null,"id","id",-1388402092),zh=new B(null,"class","class",-2030961996),Ah=new B(null,"checked","checked",-50955819),Sg=new B(null,"parents","parents",-2027538891),Bh=new B(null,"strokeColor","strokeColor",-1017463338),Ch=new B(null,"lat","lat",-580793929),Dh=new B(null,"br","br",934104792),Eh=new B(null,"complete","complete",-500388775),Fh=new B(null,"options","options",99638489),Gh=new B(null,"input","input",556931961),Hh=new B(null,"xhtml","xhtml",1912943770),
Re=new Xc(null,"quote","quote",1377916282,null),Qe=new B(null,"arglists","arglists",1661989754),Ih=new B(null,"couriers-control","couriers-control",1386141787),Pe=new Xc(null,"nil-iter","nil-iter",1101030523,null),Jh=new B(null,"add","add",235287739),Kh=new B(null,"hierarchy","hierarchy",-1053470341),Hg=new B(null,"alt-impl","alt-impl",670969595),Lh=new B(null,"fillColor","fillColor",-176906116),Mh=new B(null,"selected?","selected?",-742502788),Nh=new B(null,"lng","lng",1667213918),Oh=new B(null,
"servicing","servicing",-1502937442),Ph=new B(null,"text","text",-1790561697),Qh=new B(null,"enroute","enroute",-1681821057),Rh=new B(null,"attr","attr",-604132353);function Sh(a){var b=/\./;if("string"===typeof b)return a.replace(new RegExp(Aa(b),"g")," ");if(b instanceof RegExp)return a.replace(new RegExp(b.source,"g")," ");throw[F("Invalid match arg: "),F(b)].join("");};var Th={};function Uh(a,b){var c=Th[b];if(!c){var d=Ca(b),c=d;void 0===a.style[d]&&(d=(eb?"Webkit":db?"Moz":bb?"ms":ab?"O":null)+Da(d),void 0!==a.style[d]&&(c=d));Th[b]=c}return c};function Vh(){}function Wh(){}var Xh=function Xh(b){if(null!=b&&null!=b.dd)return b.dd(b);var c=Xh[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Xh._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("bindable.-value",b);},Yh=function Yh(b,c){if(null!=b&&null!=b.cd)return b.cd(b,c);var d=Yh[u(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Yh._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw D("bindable.-on-change",b);};
function Zh(a){return null!=a?a.zd?!0:a.zb?!1:C(Wh,a):C(Wh,a)}function $h(a){return null!=a?a.Ad?!0:a.zb?!1:C(Vh,a):C(Vh,a)}function ai(a,b){return Yh(a,b)};var bi=new w(null,2,[Hh,"http://www.w3.org/1999/xhtml",new B(null,"svg","svg",856789142),"http://www.w3.org/2000/svg"],null);ci;di;ei;U.a?U.a(0):U.call(null,0);var fi=U.a?U.a(Pd):U.call(null,Pd);function gi(a,b){ef.c(fi,Od,new P(null,2,5,Q,[a,b],null))}function hi(){}
var ii=function ii(b){if(null!=b&&null!=b.fd)return b.fd(b);var c=ii[u(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=ii._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw D("Element.-elem",b);},ji=function ji(b,c){for(var d=H(c),e=null,f=0,g=0;;)if(g<f){var k=e.O(null,g),l;if(null!=k?k.ed||(k.zb?0:C(hi,k)):C(hi,k))l=ii(k);else if(null==k)l=null;else{if(Zd(k))throw"Maps cannot be used as content";"string"===typeof k?l=document.createTextNode(String(k)):$d(k)?l=ci.a?ci.a(k):ci.call(null,
k):ge(k)?l=ji(b,k):y($h(k))?(gi(oh,k),l=ji(b,new P(null,1,5,Q,[Xh(k)],null))):y(Zh(k))?(gi(Ph,k),l=ji(b,new P(null,1,5,Q,[Xh(k)],null))):l=y(k.nodeName)?k:y(k.get)?k.get(0):function(){var b=""+F(k);return document.createTextNode(String(b))}()}y(l)&&b.appendChild(l);g+=1}else if(d=H(d)){if(ce(d))f=Hc(d),d=Ic(d),e=f,f=N(f);else{k=J(d);if(null!=k?k.ed||(k.zb?0:C(hi,k)):C(hi,k))e=ii(k);else if(null==k)e=null;else{if(Zd(k))throw"Maps cannot be used as content";"string"===typeof k?e=document.createTextNode(String(k)):
$d(k)?e=ci.a?ci.a(k):ci.call(null,k):ge(k)?e=ji(b,k):y($h(k))?(gi(oh,k),e=ji(b,new P(null,1,5,Q,[Xh(k)],null))):y(Zh(k))?(gi(Ph,k),e=ji(b,new P(null,1,5,Q,[Xh(k)],null))):e=y(k.nodeName)?k:y(k.get)?k.get(0):function(){var b=""+F(k);return document.createTextNode(String(b))}()}y(e)&&b.appendChild(e);d=K(d);e=null;f=0}g=0}else return null};
if("undefined"===typeof ch)var ch=function(){var a=U.a?U.a(Se):U.call(null,Se),b=U.a?U.a(Se):U.call(null,Se),c=U.a?U.a(Se):U.call(null,Se),d=U.a?U.a(Se):U.call(null,Se),e=fd.c(Se,Kh,Rg());return new ah(gd.b("crate.compiler","dom-binding"),function(){return function(a){return a}}(a,b,c,d,e),kh,e,a,b,c,d)}();bh(Ph,function(a,b,c){return ai(b,function(a){for(var b;b=c.firstChild;)c.removeChild(b);return ji(c,new P(null,1,5,Q,[a],null))})});
bh(Rh,function(a,b,c){a=O(b,0);var d=O(b,1);return ai(d,function(a,b){return function(a){return di.c?di.c(c,b,a):di.call(null,c,b,a)}}(b,a,d))});bh(rh,function(a,b,c){a=O(b,0);var d=O(b,1);return ai(d,function(a,b){return function(a){return y(b)?ei.c?ei.c(c,b,a):ei.call(null,c,b,a):ei.b?ei.b(c,a):ei.call(null,c,a)}}(b,a,d))});
bh(oh,function(a,b,c){return ai(b,function(a,e,f){if(y(Yc.b?Yc.b(Jh,a):Yc.call(null,Jh,a)))return a=b.md.call(null,Jh),y(a)?e=a.c?a.c(c,e,f):a.call(null,c,e,f):(c.appendChild(e),e=void 0),e;if(y(Yc.b?Yc.b(gh,a):Yc.call(null,gh,a)))return f=b.md.call(null,gh),y(f)?f.a?f.a(e):f.call(null,e):e&&e.parentNode?e.parentNode.removeChild(e):null;throw Error([F("No matching clause: "),F(a)].join(""));})});
var ei=function ei(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ei.b(arguments[0],arguments[1]);case 3:return ei.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
ei.b=function(a,b){if("string"===typeof b)a.setAttribute("style",b);else if(Zd(b))for(var c=H(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);ei.c(a,k,g);f+=1}else if(c=H(c))ce(c)?(e=Hc(c),c=Ic(c),d=e,e=N(e)):(e=J(c),d=O(e,0),e=O(e,1),ei.c(a,d,e),c=K(c),d=null,e=0),f=0;else break;else y(Zh(b))&&(gi(rh,new P(null,2,5,Q,[null,b],null)),ei.b(a,Xh(b)));return a};
ei.c=function(a,b,c){y(Zh(c))&&(gi(rh,new P(null,2,5,Q,[b,c],null)),c=Xh(c));b=te(b);if(ha(b)){var d=Uh(a,b);d&&(a.style[d]=c)}else for(d in b){c=a;var e=b[d],f=Uh(c,d);f&&(c.style[f]=e)}};ei.A=3;var di=function di(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return di.b(arguments[0],arguments[1]);case 3:return di.c(arguments[0],arguments[1],arguments[2]);default:throw Error([F("Invalid arity: "),F(c.length)].join(""));}};
di.b=function(a,b){if(y(a)){if(Zd(b)){for(var c=H(b),d=null,e=0,f=0;;)if(f<e){var g=d.O(null,f),k=O(g,0),g=O(g,1);di.c(a,k,g);f+=1}else if(c=H(c))ce(c)?(e=Hc(c),c=Ic(c),d=e,e=N(e)):(e=J(c),d=O(e,0),e=O(e,1),di.c(a,d,e),c=K(c),d=null,e=0),f=0;else break;return a}return a.getAttribute(te(b))}return null};di.c=function(a,b,c){Yc.b(b,rh)?ei.b(a,c):(y(Zh(c))&&(gi(Rh,new P(null,2,5,Q,[b,c],null)),c=Xh(c)),a.setAttribute(te(b),c));return a};di.A=3;var ki=/([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?/;
function li(a){return jf.b(Se,se.b(function(a){var c=O(a,0);a=O(a,1);return!0===a?new P(null,2,5,Q,[c,te(c)],null):new P(null,2,5,Q,[c,a],null)},hf(We.b(he,Nd),a)))}
function mi(a){var b=O(a,0),c=re(a);if(!(b instanceof B||b instanceof Xc||"string"===typeof b))throw[F(b),F(" is not a valid tag name.")].join("");var d=zg(ki,te(b)),e=O(d,0),f=O(d,1),g=O(d,2),k=O(d,3),l=function(){var a,b=/:/;a:for(b="/(?:)/"===""+F(b)?Od.b(le(M("",se.b(F,H(f)))),""):le((""+F(f)).split(b));;)if(""===(null==b?null:cc(b)))b=null==b?null:dc(b);else break a;a=b;b=O(a,0);a=O(a,1);var c;c=Ce.a(b);c=bi.a?bi.a(c):bi.call(null,c);return y(a)?new P(null,2,5,Q,[y(c)?c:b,a],null):new P(null,
2,5,Q,[Hh.a(bi),b],null)}(),m=O(l,0),n=O(l,1);a=jf.b(Se,hf(function(){return function(a){return null!=Nd(a)}}(d,e,f,g,k,l,m,n,a,b,c),new w(null,2,[yh,y(g)?g:null,zh,y(k)?Sh(k):null],null)));b=J(c);return Zd(b)?new P(null,4,5,Q,[m,n,vg(hd([a,li(b)],0)),K(c)],null):new P(null,4,5,Q,[m,n,a,c],null)}var ni=y(document.createElementNS)?function(a,b){return document.createElementNS(a,b)}:function(a,b){return document.createElement(b)};
function ci(a){var b=fi;fi=U.a?U.a(Pd):U.call(null,Pd);try{var c=mi(a),d=O(c,0),e=O(c,1),f=O(c,2),g=O(c,3),k=ni.b?ni.b(d,e):ni.call(null,d,e);di.b(k,f);ji(k,g);a:{var l=L.a?L.a(fi):L.call(null,fi),m=H(l);a=null;for(d=c=0;;)if(d<c){var n=a.O(null,d),p=O(n,0),q=O(n,1);ch.c?ch.c(p,q,k):ch.call(null,p,q,k);d+=1}else{var r=H(m);if(r){e=r;if(ce(e)){var t=Hc(e),v=Ic(e),e=t,x=N(t),m=v;a=e;c=x}else{var A=J(e),p=O(A,0),q=O(A,1);ch.c?ch.c(p,q,k):ch.call(null,p,q,k);m=K(e);a=null;c=0}d=0}else break a}}return k}finally{fi=
b}};U.a?U.a(0):U.call(null,0);function oi(a){a=se.b(ci,a);return y(Nd(a))?a:J(a)};[].push(function(){});function pi(){0!=qi&&(ri[ka(this)]=this);this.Bb=this.Bb;this.Xb=this.Xb}var qi=0,ri={};pi.prototype.Bb=!1;pi.prototype.Ab=function(){if(this.Xb)for(;this.Xb.length;)this.Xb.shift()()};var si=!bb||9<=mb,ti=bb&&!kb("9");!eb||kb("528");db&&kb("1.9b")||bb&&kb("8")||ab&&kb("9.5")||eb&&kb("528");db&&!kb("8")||bb&&kb("9");function ui(a,b){this.type=a;this.currentTarget=this.target=b;this.defaultPrevented=this.cb=!1;this.Gc=!0}ui.prototype.stopPropagation=function(){this.cb=!0};ui.prototype.preventDefault=function(){this.defaultPrevented=!0;this.Gc=!1};function vi(a){vi[" "](a);return a}vi[" "]=ea;function wi(a,b){ui.call(this,a?a.type:"");this.relatedTarget=this.currentTarget=this.target=null;this.charCode=this.keyCode=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.Cb=this.state=null;if(a){var c=this.type=a.type;this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;if(d){if(db){var e;a:{try{vi(d.nodeName);e=!0;break a}catch(f){}e=!1}e||(d=null)}}else"mouseover"==
c?d=a.fromElement:"mouseout"==c&&(d=a.toElement);this.relatedTarget=d;this.offsetX=eb||void 0!==a.offsetX?a.offsetX:a.layerX;this.offsetY=eb||void 0!==a.offsetY?a.offsetY:a.layerY;this.clientX=void 0!==a.clientX?a.clientX:a.pageX;this.clientY=void 0!==a.clientY?a.clientY:a.pageY;this.screenX=a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;
this.metaKey=a.metaKey;this.state=a.state;this.Cb=a;a.defaultPrevented&&this.preventDefault()}}va(wi,ui);wi.prototype.stopPropagation=function(){wi.$b.stopPropagation.call(this);this.Cb.stopPropagation?this.Cb.stopPropagation():this.Cb.cancelBubble=!0};wi.prototype.preventDefault=function(){wi.$b.preventDefault.call(this);var a=this.Cb;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,ti)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var xi="closure_listenable_"+(1E6*Math.random()|0),yi=0;function zi(a,b,c,d,e){this.listener=a;this.Zb=null;this.src=b;this.type=c;this.pb=!!d;this.Ub=e;this.key=++yi;this.mb=this.Nb=!1}function Ai(a){a.mb=!0;a.listener=null;a.Zb=null;a.src=null;a.Ub=null};function Bi(a){this.src=a;this.va={};this.Lb=0}Bi.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.va[f];a||(a=this.va[f]=[],this.Lb++);var g=Ci(a,b,d,e);-1<g?(b=a[g],c||(b.Nb=!1)):(b=new zi(b,this.src,f,!!d,e),b.Nb=c,a.push(b));return b};Bi.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.va))return!1;var e=this.va[a];b=Ci(e,b,c,d);return-1<b?(Ai(e[b]),Ha.splice.call(e,b,1),0==e.length&&(delete this.va[a],this.Lb--),!0):!1};
function Di(a,b){var c=b.type;c in a.va&&Oa(a.va[c],b)&&(Ai(b),0==a.va[c].length&&(delete a.va[c],a.Lb--))}Bi.prototype.nc=function(a,b,c,d){a=this.va[a.toString()];var e=-1;a&&(e=Ci(a,b,c,d));return-1<e?a[e]:null};Bi.prototype.hasListener=function(a,b){var c=void 0!==a,d=c?a.toString():"",e=void 0!==b;return Ua(this.va,function(a){for(var g=0;g<a.length;++g)if(!(c&&a[g].type!=d||e&&a[g].pb!=b))return!0;return!1})};
function Ci(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.mb&&f.listener==b&&f.pb==!!c&&f.Ub==d)return e}return-1};var Ei="closure_lm_"+(1E6*Math.random()|0),Fi={},Gi=0;
function Hi(a,b,c,d,e){if("array"==u(b))for(var f=0;f<b.length;f++)Hi(a,b[f],c,d,e);else if(c=Ii(c),a&&a[xi])a.Da.add(String(b),c,!1,d,e);else{if(!b)throw Error("Invalid event type");var f=!!d,g=Ji(a);g||(a[Ei]=g=new Bi(a));c=g.add(b,c,!1,d,e);if(!c.Zb){d=Ki();c.Zb=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,f);else if(a.attachEvent)a.attachEvent(Li(b.toString()),d);else throw Error("addEventListener and attachEvent are unavailable.");Gi++}}}
function Ki(){var a=Mi,b=si?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b}function Ni(a,b,c,d,e){if("array"==u(b))for(var f=0;f<b.length;f++)Ni(a,b[f],c,d,e);else c=Ii(c),a&&a[xi]?a.Da.remove(String(b),c,d,e):a&&(a=Ji(a))&&(b=a.nc(b,c,!!d,e))&&Oi(b)}
function Oi(a){if("number"!=typeof a&&a&&!a.mb){var b=a.src;if(b&&b[xi])Di(b.Da,a);else{var c=a.type,d=a.Zb;b.removeEventListener?b.removeEventListener(c,d,a.pb):b.detachEvent&&b.detachEvent(Li(c),d);Gi--;(c=Ji(b))?(Di(c,a),0==c.Lb&&(c.src=null,b[Ei]=null)):Ai(a)}}}function Li(a){return a in Fi?Fi[a]:Fi[a]="on"+a}function Pi(a,b,c,d){var e=!0;if(a=Ji(a))if(b=a.va[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.pb==c&&!f.mb&&(f=Qi(f,d),e=e&&!1!==f)}return e}
function Qi(a,b){var c=a.listener,d=a.Ub||a.src;a.Nb&&Oi(a);return c.call(d,b)}
function Mi(a,b){if(a.mb)return!0;if(!si){var c;if(!(c=b))a:{c=["window","event"];for(var d=ca,e;e=c.shift();)if(null!=d[e])d=d[e];else{c=null;break a}c=d}e=c;c=new wi(e,this);d=!0;if(!(0>e.keyCode||void 0!=e.returnValue)){a:{var f=!1;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(l){f=!0}if(f||void 0==e.returnValue)e.returnValue=!0}e=[];for(f=c.currentTarget;f;f=f.parentNode)e.push(f);for(var f=a.type,g=e.length-1;!c.cb&&0<=g;g--){c.currentTarget=e[g];var k=Pi(e[g],f,!0,c),d=d&&k}for(g=0;!c.cb&&
g<e.length;g++)c.currentTarget=e[g],k=Pi(e[g],f,!1,c),d=d&&k}return d}return Qi(a,new wi(b,this))}function Ji(a){a=a[Ei];return a instanceof Bi?a:null}var Ri="__closure_events_fn_"+(1E9*Math.random()>>>0);function Ii(a){if(ia(a))return a;a[Ri]||(a[Ri]=function(b){return a.handleEvent(b)});return a[Ri]};function Si(){pi.call(this);this.Da=new Bi(this);this.Lc=this;this.pc=null}va(Si,pi);Si.prototype[xi]=!0;h=Si.prototype;h.addEventListener=function(a,b,c,d){Hi(this,a,b,c,d)};h.removeEventListener=function(a,b,c,d){Ni(this,a,b,c,d)};
h.dispatchEvent=function(a){var b,c=this.pc;if(c)for(b=[];c;c=c.pc)b.push(c);var c=this.Lc,d=a.type||a;if(ha(a))a=new ui(a,c);else if(a instanceof ui)a.target=a.target||c;else{var e=a;a=new ui(d,c);Za(a,e)}var e=!0,f;if(b)for(var g=b.length-1;!a.cb&&0<=g;g--)f=a.currentTarget=b[g],e=Ti(f,d,!0,a)&&e;a.cb||(f=a.currentTarget=c,e=Ti(f,d,!0,a)&&e,a.cb||(e=Ti(f,d,!1,a)&&e));if(b)for(g=0;!a.cb&&g<b.length;g++)f=a.currentTarget=b[g],e=Ti(f,d,!1,a)&&e;return e};
h.Ab=function(){Si.$b.Ab.call(this);if(this.Da){var a=this.Da,b=0,c;for(c in a.va){for(var d=a.va[c],e=0;e<d.length;e++)++b,Ai(d[e]);delete a.va[c];a.Lb--}}this.pc=null};function Ti(a,b,c,d){b=a.Da.va[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var g=b[f];if(g&&!g.mb&&g.pb==c){var k=g.listener,l=g.Ub||g.src;g.Nb&&Di(a.Da,g);e=!1!==k.call(l,d)&&e}}return e&&0!=d.Gc}h.nc=function(a,b,c,d){return this.Da.nc(String(a),b,c,d)};
h.hasListener=function(a,b){return this.Da.hasListener(void 0!==a?String(a):void 0,b)};function Ui(a,b,c){if(ia(a))c&&(a=sa(a,c));else if(a&&"function"==typeof a.handleEvent)a=sa(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<b?-1:ca.setTimeout(a,b||0)};function Vi(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};function Wi(a){if("function"==typeof a.Tb)return a.Tb();if(ha(a))return a.split("");if(fa(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return Va(a)}
function Xi(a,b){if("function"==typeof a.forEach)a.forEach(b,void 0);else if(fa(a)||ha(a))Ka(a,b,void 0);else{var c;if("function"==typeof a.Db)c=a.Db();else if("function"!=typeof a.Tb)if(fa(a)||ha(a)){c=[];for(var d=a.length,e=0;e<d;e++)c.push(e)}else c=Xa(a);else c=void 0;for(var d=Wi(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a)}};function Yi(a,b){this.Oa={};this.ta=[];this.Na=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)}h=Yi.prototype;h.Tb=function(){Zi(this);for(var a=[],b=0;b<this.ta.length;b++)a.push(this.Oa[this.ta[b]]);return a};h.Db=function(){Zi(this);return this.ta.concat()};
h.equals=function(a,b){if(this===a)return!0;if(this.Na!=a.Na)return!1;var c=b||$i;Zi(this);for(var d,e=0;d=this.ta[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};function $i(a,b){return a===b}h.isEmpty=function(){return 0==this.Na};h.clear=function(){this.Oa={};this.Na=this.ta.length=0};h.remove=function(a){return Object.prototype.hasOwnProperty.call(this.Oa,a)?(delete this.Oa[a],this.Na--,this.ta.length>2*this.Na&&Zi(this),!0):!1};
function Zi(a){if(a.Na!=a.ta.length){for(var b=0,c=0;b<a.ta.length;){var d=a.ta[b];Object.prototype.hasOwnProperty.call(a.Oa,d)&&(a.ta[c++]=d);b++}a.ta.length=c}if(a.Na!=a.ta.length){for(var e={},c=b=0;b<a.ta.length;)d=a.ta[b],Object.prototype.hasOwnProperty.call(e,d)||(a.ta[c++]=d,e[d]=1),b++;a.ta.length=c}}h.get=function(a,b){return Object.prototype.hasOwnProperty.call(this.Oa,a)?this.Oa[a]:b};
h.set=function(a,b){Object.prototype.hasOwnProperty.call(this.Oa,a)||(this.Na++,this.ta.push(a));this.Oa[a]=b};h.addAll=function(a){var b;a instanceof Yi?(b=a.Db(),a=a.Tb()):(b=Xa(a),a=Va(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};h.forEach=function(a,b){for(var c=this.Db(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};h.clone=function(){return new Yi(this)};function aj(a,b,c,d,e){this.reset(a,b,c,d,e)}aj.prototype.zc=null;var bj=0;aj.prototype.reset=function(a,b,c,d,e){"number"==typeof e||bj++;d||ta();this.Hb=a;this.jd=b;delete this.zc};aj.prototype.Ic=function(a){this.Hb=a};function cj(a){this.Dc=a;this.Ac=this.gc=this.Hb=this.Yb=null}function dj(a,b){this.name=a;this.value=b}dj.prototype.toString=function(){return this.name};var ej=new dj("SEVERE",1E3),fj=new dj("INFO",800),gj=new dj("CONFIG",700),hj=new dj("FINE",500);h=cj.prototype;h.getName=function(){return this.Dc};h.getParent=function(){return this.Yb};h.Ic=function(a){this.Hb=a};function ij(a){if(a.Hb)return a.Hb;if(a.Yb)return ij(a.Yb);Ga("Root logger has no level set.");return null}
h.log=function(a,b,c){if(a.value>=ij(this).value)for(ia(b)&&(b=b()),a=new aj(a,String(b),this.Dc),c&&(a.zc=c),c="log:"+a.jd,ca.console&&(ca.console.timeStamp?ca.console.timeStamp(c):ca.console.markTimeline&&ca.console.markTimeline(c)),ca.msWriteProfilerMark&&ca.msWriteProfilerMark(c),c=this;c;){b=c;var d=a;if(b.Ac)for(var e=0,f=void 0;f=b.Ac[e];e++)f(d);c=c.getParent()}};h.info=function(a,b){this.log(fj,a,b)};var jj={},kj=null;
function lj(a){kj||(kj=new cj(""),jj[""]=kj,kj.Ic(gj));var b;if(!(b=jj[a])){b=new cj(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=lj(a.substr(0,c));c.gc||(c.gc={});c.gc[d]=b;b.Yb=c;jj[a]=b}return b};function mj(a,b){a&&a.log(hj,b,void 0)};function nj(){}nj.prototype.rc=null;function oj(a){var b;(b=a.rc)||(b={},pj(a)&&(b[0]=!0,b[1]=!0),b=a.rc=b);return b};var qj;function rj(){}va(rj,nj);function sj(a){return(a=pj(a))?new ActiveXObject(a):new XMLHttpRequest}function pj(a){if(!a.Bc&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.Bc=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.Bc}qj=new rj;var tj=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function uj(a){if(vj){vj=!1;var b=ca.location;if(b){var c=b.href;if(c&&(c=(c=uj(c)[3]||null)?decodeURI(c):c)&&c!=b.hostname)throw vj=!0,Error();}}return a.match(tj)}var vj=eb;function wj(a){Si.call(this);this.headers=new Yi;this.dc=a||null;this.Qa=!1;this.cc=this.I=null;this.Gb=this.Cc=this.Wb="";this.ab=this.oc=this.Vb=this.mc=!1;this.Kb=0;this.ac=null;this.Fc=xj;this.bc=this.qd=!1}va(wj,Si);var xj="",yj=wj.prototype,zj=lj("goog.net.XhrIo");yj.Ga=zj;var Aj=/^https?$/i,Bj=["POST","PUT"],Cj=[];h=wj.prototype;h.Mc=function(){if(!this.Bb&&(this.Bb=!0,this.Ab(),0!=qi)){var a=ka(this);delete ri[a]}Oa(Cj,this)};
h.send=function(a,b,c,d){if(this.I)throw Error("[goog.net.XhrIo] Object is active with another request\x3d"+this.Wb+"; newUri\x3d"+a);b=b?b.toUpperCase():"GET";this.Wb=a;this.Gb="";this.Cc=b;this.mc=!1;this.Qa=!0;this.I=this.dc?sj(this.dc):sj(qj);this.cc=this.dc?oj(this.dc):oj(qj);this.I.onreadystatechange=sa(this.Ec,this);try{mj(this.Ga,Dj(this,"Opening Xhr")),this.oc=!0,this.I.open(b,String(a),!0),this.oc=!1}catch(f){mj(this.Ga,Dj(this,"Error opening Xhr: "+f.message));Ej(this,f);return}a=c||"";
var e=this.headers.clone();d&&Xi(d,function(a,b){e.set(b,a)});d=La(e.Db());c=ca.FormData&&a instanceof ca.FormData;!(0<=Ja(Bj,b))||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset\x3dutf-8");e.forEach(function(a,b){this.I.setRequestHeader(b,a)},this);this.Fc&&(this.I.responseType=this.Fc);"withCredentials"in this.I&&(this.I.withCredentials=this.qd);try{Fj(this),0<this.Kb&&(this.bc=Gj(this.I),mj(this.Ga,Dj(this,"Will abort after "+this.Kb+"ms if incomplete, xhr2 "+this.bc)),this.bc?
(this.I.timeout=this.Kb,this.I.ontimeout=sa(this.Jc,this)):this.ac=Ui(this.Jc,this.Kb,this)),mj(this.Ga,Dj(this,"Sending request")),this.Vb=!0,this.I.send(a),this.Vb=!1}catch(f){mj(this.Ga,Dj(this,"Send error: "+f.message)),Ej(this,f)}};function Gj(a){return bb&&kb(9)&&"number"==typeof a.timeout&&void 0!==a.ontimeout}function Na(a){return"content-type"==a.toLowerCase()}
h.Jc=function(){"undefined"!=typeof aa&&this.I&&(this.Gb="Timed out after "+this.Kb+"ms, aborting",mj(this.Ga,Dj(this,this.Gb)),this.dispatchEvent("timeout"),this.abort(8))};function Ej(a,b){a.Qa=!1;a.I&&(a.ab=!0,a.I.abort(),a.ab=!1);a.Gb=b;Hj(a);Ij(a)}function Hj(a){a.mc||(a.mc=!0,a.dispatchEvent("complete"),a.dispatchEvent("error"))}
h.abort=function(){this.I&&this.Qa&&(mj(this.Ga,Dj(this,"Aborting")),this.Qa=!1,this.ab=!0,this.I.abort(),this.ab=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Ij(this))};h.Ab=function(){this.I&&(this.Qa&&(this.Qa=!1,this.ab=!0,this.I.abort(),this.ab=!1),Ij(this,!0));wj.$b.Ab.call(this)};h.Ec=function(){this.Bb||(this.oc||this.Vb||this.ab?Jj(this):this.ld())};h.ld=function(){Jj(this)};
function Jj(a){if(a.Qa&&"undefined"!=typeof aa)if(a.cc[1]&&4==Kj(a)&&2==a.getStatus())mj(a.Ga,Dj(a,"Local request error detected and ignored"));else if(a.Vb&&4==Kj(a))Ui(a.Ec,0,a);else if(a.dispatchEvent("readystatechange"),4==Kj(a)){mj(a.Ga,Dj(a,"Request complete"));a.Qa=!1;try{var b=a.getStatus(),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=!0;break a;default:c=!1}var d;if(!(d=c)){var e;if(e=0===b){var f=uj(String(a.Wb))[1]||null;if(!f&&ca.self&&ca.self.location)var g=
ca.self.location.protocol,f=g.substr(0,g.length-1);e=!Aj.test(f?f.toLowerCase():"")}d=e}if(d)a.dispatchEvent("complete"),a.dispatchEvent("success");else{var k;try{k=2<Kj(a)?a.I.statusText:""}catch(l){mj(a.Ga,"Can not get status: "+l.message),k=""}a.Gb=k+" ["+a.getStatus()+"]";Hj(a)}}finally{Ij(a)}}}
function Ij(a,b){if(a.I){Fj(a);var c=a.I,d=a.cc[0]?ea:null;a.I=null;a.cc=null;b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(e){(c=a.Ga)&&c.log(ej,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}}function Fj(a){a.I&&a.bc&&(a.I.ontimeout=null);"number"==typeof a.ac&&(ca.clearTimeout(a.ac),a.ac=null)}function Kj(a){return a.I?a.I.readyState:0}h.getStatus=function(){try{return 2<Kj(this)?this.I.status:-1}catch(a){return-1}};
function Lj(a){if(a.I)return Vi(a.I.responseText)}h.getResponseHeader=function(a){return this.I&&4==Kj(this)?this.I.getResponseHeader(a):void 0};h.getAllResponseHeaders=function(){return this.I&&4==Kj(this)?this.I.getAllResponseHeaders():""};function Dj(a,b){return b+" ["+a.Cc+" "+a.Wb+" "+a.getStatus()+"]"};var Y,Mj=new w(null,7,[dh,[],ih,null,Ih,new w(null,2,[Mh,!0,hh,"#8E44AD"],null),vh,null,eh,"2015-05-01",jh,moment().format("YYYY-MM-DD"),wh,new w(null,6,[xh,new w(null,2,[hh,"#ff0000",Mh,!0],null),nh,new w(null,2,[hh,"#808080",Mh,!0],null),Qh,new w(null,2,[hh,"#ffdd00",Mh,!0],null),Oh,new w(null,2,[hh,"#0000ff",Mh,!0],null),Eh,new w(null,2,[hh,"#00ff00",Mh,!0],null),sh,new w(null,2,[hh,"#000000",Mh,!0],null)],null)],null);Y=U.a?U.a(Mj):U.call(null,Mj);
function Nj(a,b){return J(hf(function(a){return Yc.b(b,a.id)},a))}var Oj=document.getElementById("base-url").getAttribute("value");function Pj(a){var b=vh.a(L.a?L.a(Y):L.call(null,Y)),c=lf(L.a?L.a(Y):L.call(null,Y),new P(null,2,5,Q,[Ih,hh],null));return Qj(a,b,c,function(){return ld})}function Qj(a,b,c,d){b=new google.maps.Circle({strokeColor:c,strokeOpacity:1,strokeWeight:2,fillColor:c,fillOpacity:1,map:b,center:{lat:a.lat,lng:a.lng},radius:200});b.addListener("click",d);return a.point=b}
function Rj(a,b){var c=Date.parse(eh.a(L.a?L.a(a):L.call(null,a))),d=b.timestamp_created,e=Date.parse(jh.a(L.a?L.a(a):L.call(null,a)))+864E5,f=b.status,f=lf(L.a?L.a(a):L.call(null,a),new P(null,3,5,Q,[wh,Ce.a(f),Mh],null));return(c=c<=d&&d<=e)?f:c}function Sj(a,b,c,d){return kf(function(b){if(y(d.a?d.a(b):d.call(null,b))){var f=vh.a(L.a?L.a(a):L.call(null,a));b=null!=b[c]?b[c].setMap(f):null}else b=null!=b[c]?b[c].setMap(null):null;return b},b)}
function Tj(a,b){var c=b.active,d=b.on_duty,e=b.connected,f=lf(L.a?L.a(a):L.call(null,a),new P(null,2,5,Q,[Ih,Mh],null));return y(e)?y(c)?y(d)?f:d:c:e}function Uj(){function a(a){return Sj(Y,ih.a(L.a?L.a(Y):L.call(null,Y)),a,Xe(Tj,Y))}a("point");return a("label")}
function Vj(a,b,c){a=[F(Oj),F(a)].join("");var d=Og(new w(null,1,["Content-Type","application/json"],null)),d=hd([b,d],0);b=O(d,0);var d=O(d,1),e=new wj;Cj.push(e);c&&e.Da.add("complete",c,!1,void 0,void 0);e.Da.add("ready",e.Mc,!0,void 0,void 0);e.send(a,"POST",b,d);return e}
function Wj(){Vj("couriers",Se,function(a){a=a.target;var b=Lj(a),c=b.couriers;ef.m(Y,Td,ih,c);kf(function(){return function(a){return Pj(a)}}(a,b,c),ih.a(L.a?L.a(Y):L.call(null,Y)));kf(function(){return function(a){var b=vh.a(L.a?L.a(Y):L.call(null,Y)),c=a.name,b=new MapLabel({map:b,position:new google.maps.LatLng(a.lat,a.lng),text:c,fontSize:20,align:"center"});return a.label=b}}(a,b,c),ih.a(L.a?L.a(Y):L.call(null,Y)));return Uj()})}
function Xj(){Vj("couriers",Se,function(a){a=a.target;var b=Lj(a),c=b.couriers;kf(function(){return function(a){var b=Nj(ih.a(L.a?L.a(Y):L.call(null,Y)),a.id),c=b.point,g=b.label,k=a.lat,l=a.lng,m=a.active,n=a.on_duty;a=a.connected;var p=Og(new w(null,2,[Ch,k,Nh,l],null));b.lat=k;b.lng=l;b.active=m;b.on_duty=n;b.connected=a;c.setCenter(p);g.set("position",new google.maps.LatLng(k,l));return g.draw()}}(a,b,c),c);return Uj()})}
function Yj(a,b){var c;c=Og(new w(null,1,[fh,a],null));c=JSON.stringify(c);return Vj("orders-since-date",c,b)}function Zj(a,b){return Qj(b,vh.a(L.a?L.a(a):L.call(null,a)),lf(L.a?L.a(a):L.call(null,a),new P(null,3,5,Q,[wh,Ce.a(b.status),hh],null)),function(){return console.log([F("timestamp_created: "),F(new Date(b.timestamp_created))].join(""))})}function ak(a){return a.timestamp_created=Date.parse(a.timestamp_created)}
function bk(a,b){Yj(b,function(b){b=Lj(b.target).orders;return null!=b?(ef.m(a,Td,dh,b),kf(Xe(Zj,a),dh.a(L.a?L.a(a):L.call(null,a))),kf(ak,dh.a(L.a?L.a(a):L.call(null,a))),Sj(a,dh.a(L.a?L.a(a):L.call(null,a)),"point",Xe(Rj,a))):null})}
function ck(a,b){var c=b.status,d=lf(L.a?L.a(a):L.call(null,a),new P(null,3,5,Q,[wh,Ce.a(c),hh],null)),e=Nj(dh.a(L.a?L.a(a):L.call(null,a)),b.id);if(null==e)return Zj(a,b),ak(b),dh.a(L.a?L.a(a):L.call(null,a)).push(b);e.status=c;lf(L.a?L.a(a):L.call(null,a),new P(null,2,5,Q,[wh,Ce.a(c)],null));return e.point.setOptions(Og(new w(null,1,[Fh,new w(null,2,[Lh,d,Bh,d],null)],null)))}
function dk(){return Yj(moment().format("YYYY-MM-DD"),function(a){a=Lj(a.target).orders;return null!=a?kf(Xe(ck,Y),a):null})}function ek(a){return oi(hd([new P(null,2,5,Q,[th,new w(null,1,[rh,[F("height: 10px;"),F(" width: 10px;"),F(" display: inline-block;"),F(" float: right;"),F(" border-radius: 10px;"),F(" margin-top: 7px;"),F(" margin-left: 5px;"),F(" background-color: "),F(a)].join("")],null)],null)],0))}
function fk(a){var b=oi(hd([new P(null,2,5,Q,[Gh,new w(null,5,[ph,"checkbox",lh,"orders",mh,"orders",zh,"orders-checkbox",Ah,!0],null)],null)],0)),c=oi(hd([new P(null,5,5,Q,[th,new w(null,1,[zh,"setCenterText"],null),b,a,ek(lf(L.a?L.a(Y):L.call(null,Y),new P(null,3,5,Q,[wh,Ce.a(a),hh],null)))],null)],0));b.addEventListener("click",function(b){return function(){y(b.checked)?ef.m(Y,mf,new P(null,3,5,Q,[wh,Ce.a(a),Mh],null),!0):ef.m(Y,mf,new P(null,3,5,Q,[wh,Ce.a(a),Mh],null),!1);return Sj(Y,dh.a(L.a?
L.a(Y):L.call(null,Y)),"point",Xe(Rj,Y))}}(b,c));return c}function gk(){return oi(hd([new P(null,2,5,Q,[th,new P(null,3,5,Q,[th,new w(null,2,[zh,"setCenterUI",qh,"Select order status"],null),se.b(function(a){return fk(a)},Wc("unassigned","accepted","enroute","servicing","complete","cancelled"))],null)],null)],0))}
function hk(){function a(a){return oi(hd([new P(null,2,5,Q,[Gh,new w(null,4,[ph,"text",lh,"orders-date",zh,"date-picker",mh,a],null)],null)],0))}var b=function(){return function(a,b){return new Pikaday({field:a,format:"YYYY-MM-DD",onSelect:b})}}(a),c=a(eh.a(L.a?L.a(Y):L.call(null,Y))),d=b(c,function(a,b,c){return function(){ef.m(Y,Td,eh,c.value);return Sj(Y,dh.a(L.a?L.a(Y):L.call(null,Y)),"point",Xe(Rj,Y))}}(a,b,c)),e=a(jh.a(L.a?L.a(Y):L.call(null,Y)));b(e,function(a,b,c,d,e){return function(){ef.m(Y,
Td,jh,e.value);return Sj(Y,dh.a(L.a?L.a(Y):L.call(null,Y)),"point",Xe(Rj,Y))}}(a,b,c,d,e));return oi(hd([new P(null,2,5,Q,[th,new P(null,3,5,Q,[th,new w(null,2,[zh,"setCenterUI",qh,"Click to change dates"],null),new P(null,9,5,Q,[th,new w(null,1,[zh,"setCenterText"],null),"Orders",new P(null,1,5,Q,[Dh],null),"From: ",c,new P(null,1,5,Q,[Dh],null),"To:   ",e],null)],null)],null)],0))}
function ik(){var a=oi(hd([new P(null,2,5,Q,[Gh,new w(null,5,[ph,"checkbox",lh,"couriers",mh,"couriers",zh,"couriers-checkbox",Ah,!0],null)],null)],0)),b=oi(hd([new P(null,5,5,Q,[th,new w(null,1,[zh,"setCenterText"],null),a,"Couriers",ek(lf(L.a?L.a(Y):L.call(null,Y),new P(null,2,5,Q,[Ih,hh],null)))],null)],0));a.addEventListener("click",function(a){return function(){y(a.checked)?ef.m(Y,mf,new P(null,2,5,Q,[Ih,Mh],null),!0):ef.m(Y,mf,new P(null,2,5,Q,[Ih,Mh],null),!1);return Sj(Y,ih.a(L.a?L.a(Y):L.call(null,
Y)),"point",Xe(Tj,Y))}}(a,b));return oi(hd([new P(null,2,5,Q,[th,new P(null,3,5,Q,[th,new w(null,2,[zh,"setCenterUI",qh,"Select couriers"],null),b],null)],null)],0))}function jk(a,b){a.controls[google.maps.ControlPosition.LEFT_TOP].push(b)}var kk=function kk(b,c){return setTimeout(function(){b.w?b.w():b.call(null);return kk(b,c)},c)};
da("dashboard_cljs.core.init_map_orders",function(){ef.m(Y,Td,vh,new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:12}));jk(vh.a(L.a?L.a(Y):L.call(null,Y)),oi(hd([new P(null,3,5,Q,[th,hk(),gk()],null)],0)));bk(Y,"");return kk(function(){return dk()},6E5)});
da("dashboard_cljs.core.init_map_couriers",function(){ef.m(Y,Td,vh,new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:12}));jk(vh.a(L.a?L.a(Y):L.call(null,Y)),oi(hd([new P(null,3,5,Q,[th,gk(),oi(hd([new P(null,2,5,Q,[th,ik()],null)],0))],null)],0)));bk(Y,moment().format("YYYY-MM-DD"));Wj();return kk(function(){Xj();return dk()},5E3)});