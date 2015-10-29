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

var g,aa=aa||{},u=this;function ba(a){return void 0!==a}function da(){}
function y(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function ea(a){var b=y(a);return"array"==b||"object"==b&&"number"==typeof a.length}function fa(a){return"string"==typeof a}function ha(a){return"function"==y(a)}function ia(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}function ka(a){return a[ma]||(a[ma]=++na)}var ma="closure_uid_"+(1E9*Math.random()>>>0),na=0;function oa(a,b,c){return a.call.apply(a.bind,arguments)}
function ra(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function sa(a,b,c){sa=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?oa:ra;return sa.apply(null,arguments)}var ta=Date.now||function(){return+new Date};
function va(a,b){function c(){}c.prototype=b.prototype;a.dc=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.ic=function(a,c,f){for(var h=Array(arguments.length-2),k=2;k<arguments.length;k++)h[k-2]=arguments[k];return b.prototype[c].apply(a,h)}};function wa(a){if(Error.captureStackTrace)Error.captureStackTrace(this,wa);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}va(wa,Error);wa.prototype.name="CustomError";var xa;function za(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")}var Aa=String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};function Ba(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")}function Ca(a,b){return a<b?-1:a>b?1:0}
function Ea(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})}function Fa(a){var b=fa(void 0)?Ba(void 0):"\\s";return a.replace(new RegExp("(^"+(b?"|["+b+"]+":"")+")([a-z])","g"),function(a,b,e){return b+e.toUpperCase()})};function Ga(a,b){b.unshift(a);wa.call(this,za.apply(null,b));b.shift()}va(Ga,wa);Ga.prototype.name="AssertionError";function Ha(a,b){throw new Ga("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};var Ja=Array.prototype,Ka=Ja.indexOf?function(a,b,c){return Ja.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(fa(a))return fa(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},La=Ja.forEach?function(a,b,c){Ja.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=fa(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},Ma=Ja.filter?function(a,b,c){return Ja.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],
f=0,h=fa(a)?a.split(""):a,k=0;k<d;k++)if(k in h){var l=h[k];b.call(c,l,k,a)&&(e[f++]=l)}return e},Na=Ja.some?function(a,b,c){return Ja.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=fa(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1};function Oa(a){var b;a:{b=Pa;for(var c=a.length,d=fa(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){b=e;break a}b=-1}return 0>b?null:fa(a)?a.charAt(b):a[b]}
function Qa(a,b){var c=Ka(a,b),d;(d=0<=c)&&Ja.splice.call(a,c,1);return d}function Sa(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]}function Ta(a,b){return a>b?1:a<b?-1:0};var Ua;a:{var Va=u.navigator;if(Va){var Wa=Va.userAgent;if(Wa){Ua=Wa;break a}}Ua=""}function Xa(a){return-1!=Ua.indexOf(a)};function Ya(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function Za(a,b){for(var c in a)if(b.call(void 0,a[c],c,a))return!0;return!1}function $a(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function ab(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}var bb="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
function db(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<bb.length;f++)c=bb[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}}function eb(a){var b=arguments.length;if(1==b&&"array"==y(arguments[0]))return eb.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};function fb(){return Xa("Opera")||Xa("OPR")}function gb(){return(Xa("Chrome")||Xa("CriOS"))&&!fb()&&!Xa("Edge")};var hb=fb(),ib=Xa("Trident")||Xa("MSIE"),jb=Xa("Edge"),kb=Xa("Gecko")&&!(-1!=Ua.toLowerCase().indexOf("webkit")&&!Xa("Edge"))&&!(Xa("Trident")||Xa("MSIE"))&&!Xa("Edge"),lb=-1!=Ua.toLowerCase().indexOf("webkit")&&!Xa("Edge");function mb(){var a=Ua;if(kb)return/rv\:([^\);]+)(\)|;)/.exec(a);if(jb)return/Edge\/([\d\.]+)/.exec(a);if(ib)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(lb)return/WebKit\/(\S+)/.exec(a)}function nb(){var a=u.document;return a?a.documentMode:void 0}
var pb=function(){if(hb&&u.opera){var a=u.opera.version;return ha(a)?a():a}var a="",b=mb();b&&(a=b?b[1]:"");return ib&&(b=nb(),b>parseFloat(a))?String(b):a}(),qb={};
function rb(a){var b;if(!(b=qb[a])){b=0;for(var c=Aa(String(pb)).split("."),d=Aa(String(a)).split("."),e=Math.max(c.length,d.length),f=0;0==b&&f<e;f++){var h=c[f]||"",k=d[f]||"",l=RegExp("(\\d*)(\\D*)","g"),n=RegExp("(\\d*)(\\D*)","g");do{var m=l.exec(h)||["","",""],p=n.exec(k)||["","",""];if(0==m[0].length&&0==p[0].length)break;b=Ca(0==m[1].length?0:parseInt(m[1],10),0==p[1].length?0:parseInt(p[1],10))||Ca(0==m[2].length,0==p[2].length)||Ca(m[2],p[2])}while(0==b)}b=qb[a]=0<=b}return b}
var sb=u.document,tb=sb&&ib?nb()||("CSS1Compat"==sb.compatMode?parseInt(pb,10):5):void 0;var ub=!kb&&!ib||ib&&9<=tb||kb&&rb("1.9.1");ib&&rb("9");eb("area base br col command embed hr img input keygen link meta param source track wbr".split(" "));function vb(a,b,c){function d(c){c&&b.appendChild(fa(c)?a.createTextNode(c):c)}for(var e=1;e<c.length;e++){var f=c[e];!ea(f)||ia(f)&&0<f.nodeType?d(f):La(wb(f)?Sa(f):f,d)}}function xb(a){return a&&a.parentNode?a.parentNode.removeChild(a):null}function wb(a){if(a&&"number"==typeof a.length){if(ia(a))return"function"==typeof a.item||"string"==typeof a.item;if(ha(a))return"function"==typeof a.item}return!1}function yb(a){this.Uc=a||u.document||document}g=yb.prototype;g.createElement=function(a){return this.Uc.createElement(a)};
g.createTextNode=function(a){return this.Uc.createTextNode(String(a))};g.ab=function(){var a=this.Uc;return a.parentWindow||a.defaultView};g.appendChild=function(a,b){a.appendChild(b)};g.append=function(a,b){vb(9==a.nodeType?a:a.ownerDocument||a.document,a,arguments)};g.canHaveChildren=function(a){if(1!=a.nodeType)return!1;switch(a.tagName){case "APPLET":case "AREA":case "BASE":case "BR":case "COL":case "COMMAND":case "EMBED":case "FRAME":case "HR":case "IMG":case "INPUT":case "IFRAME":case "ISINDEX":case "KEYGEN":case "LINK":case "NOFRAMES":case "NOSCRIPT":case "META":case "OBJECT":case "PARAM":case "SCRIPT":case "SOURCE":case "STYLE":case "TRACK":case "WBR":return!1}return!0};
g.removeNode=xb;g.Bd=function(a){return ub&&void 0!=a.children?a.children:Ma(a.childNodes,function(a){return 1==a.nodeType})};g.contains=function(a,b){if(a.contains&&1==b.nodeType)return a==b||a.contains(b);if("undefined"!=typeof a.compareDocumentPosition)return a==b||Boolean(a.compareDocumentPosition(b)&16);for(;b&&a!=b;)b=b.parentNode;return b==a};function zb(a,b){null!=a&&this.append.apply(this,arguments)}g=zb.prototype;g.Ya="";g.set=function(a){this.Ya=""+a};g.append=function(a,b,c){this.Ya+=a;if(null!=b)for(var d=1;d<arguments.length;d++)this.Ya+=arguments[d];return this};g.clear=function(){this.Ya=""};g.getLength=function(){return this.Ya.length};g.toString=function(){return this.Ya};var Ab={},Bb;if("undefined"===typeof Cb)var Cb=function(){throw Error("No *print-fn* fn set for evaluation environment");};if("undefined"===typeof Db)var Db=function(){throw Error("No *print-err-fn* fn set for evaluation environment");};var Eb=null;if("undefined"===typeof Fb)var Fb=null;function Gb(){return new Ib(null,5,[Jb,!0,Kb,!0,Lb,!1,Mb,!1,Nb,null],null)}Ob;function A(a){return null!=a&&!1!==a}Pb;B;function Qb(a){return a instanceof Array}function Rb(a){return null==a?!0:!1===a?!0:!1}
function C(a,b){return a[y(null==b?null:b)]?!0:a._?!0:!1}function Sb(a){return null==a?null:a.constructor}function E(a,b){var c=Sb(b),c=A(A(c)?c.rd:c)?c.oc:y(b);return Error(["No protocol method ",a," defined for type ",c,": ",b].join(""))}function Tb(a){var b=a.oc;return A(b)?b:""+G(a)}var Ub="undefined"!==typeof Symbol&&"function"===y(Symbol)?Symbol.iterator:"@@iterator";function Vb(a){for(var b=a.length,c=Array(b),d=0;;)if(d<b)c[d]=a[d],d+=1;else break;return c}Wb;Xb;
var Ob=function Ob(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Ob.a(arguments[0]);case 2:return Ob.b(arguments[0],arguments[1]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};Ob.a=function(a){return Ob.b(null,a)};Ob.b=function(a,b){function c(a,b){a.push(b);return a}var d=[];return Xb.c?Xb.c(c,d,b):Xb.call(null,c,d,b)};Ob.A=2;function Yb(){}
var Zb=function Zb(b){if(null!=b&&null!=b.Y)return b.Y(b);var c=Zb[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Zb._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("ICounted.-count",b);},$b=function $b(b){if(null!=b&&null!=b.X)return b.X(b);var c=$b[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=$b._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IEmptyableCollection.-empty",b);};function ac(){}
var dc=function dc(b,c){if(null!=b&&null!=b.V)return b.V(b,c);var d=dc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=dc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("ICollection.-conj",b);};function ec(){}
var H=function H(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return H.b(arguments[0],arguments[1]);case 3:return H.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
H.b=function(a,b){if(null!=a&&null!=a.O)return a.O(a,b);var c=H[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=H._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw E("IIndexed.-nth",a);};H.c=function(a,b,c){if(null!=a&&null!=a.Aa)return a.Aa(a,b,c);var d=H[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=H._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw E("IIndexed.-nth",a);};H.A=3;function fc(){}
var gc=function gc(b){if(null!=b&&null!=b.ca)return b.ca(b);var c=gc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=gc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("ISeq.-first",b);},hc=function hc(b){if(null!=b&&null!=b.va)return b.va(b);var c=hc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=hc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("ISeq.-rest",b);};function ic(){}function jc(){}
var kc=function kc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return kc.b(arguments[0],arguments[1]);case 3:return kc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
kc.b=function(a,b){if(null!=a&&null!=a.L)return a.L(a,b);var c=kc[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=kc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw E("ILookup.-lookup",a);};kc.c=function(a,b,c){if(null!=a&&null!=a.H)return a.H(a,b,c);var d=kc[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=kc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw E("ILookup.-lookup",a);};kc.A=3;
var lc=function lc(b,c){if(null!=b&&null!=b.Oc)return b.Oc(b,c);var d=lc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=lc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IAssociative.-contains-key?",b);},mc=function mc(b,c,d){if(null!=b&&null!=b.fb)return b.fb(b,c,d);var e=mc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=mc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw E("IAssociative.-assoc",b);};function nc(){}
function oc(){}var pc=function pc(b){if(null!=b&&null!=b.Ob)return b.Ob(b);var c=pc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=pc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IMapEntry.-key",b);},qc=function qc(b){if(null!=b&&null!=b.Pb)return b.Pb(b);var c=qc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=qc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IMapEntry.-val",b);};function rc(){}
var sc=function sc(b){if(null!=b&&null!=b.hb)return b.hb(b);var c=sc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=sc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IStack.-peek",b);},tc=function tc(b){if(null!=b&&null!=b.ib)return b.ib(b);var c=tc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=tc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IStack.-pop",b);};function uc(){}
var vc=function vc(b,c,d){if(null!=b&&null!=b.jb)return b.jb(b,c,d);var e=vc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=vc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw E("IVector.-assoc-n",b);},wc=function wc(b){if(null!=b&&null!=b.lc)return b.lc(b);var c=wc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=wc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IDeref.-deref",b);};function xc(){}
var yc=function yc(b){if(null!=b&&null!=b.S)return b.S(b);var c=yc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=yc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IMeta.-meta",b);},zc=function zc(b,c){if(null!=b&&null!=b.U)return b.U(b,c);var d=zc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=zc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IWithMeta.-with-meta",b);};function Ac(){}
var Bc=function Bc(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Bc.b(arguments[0],arguments[1]);case 3:return Bc.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
Bc.b=function(a,b){if(null!=a&&null!=a.aa)return a.aa(a,b);var c=Bc[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Bc._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw E("IReduce.-reduce",a);};Bc.c=function(a,b,c){if(null!=a&&null!=a.ba)return a.ba(a,b,c);var d=Bc[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Bc._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw E("IReduce.-reduce",a);};Bc.A=3;
var Cc=function Cc(b,c){if(null!=b&&null!=b.v)return b.v(b,c);var d=Cc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Cc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IEquiv.-equiv",b);},Dc=function Dc(b){if(null!=b&&null!=b.P)return b.P(b);var c=Dc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Dc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IHash.-hash",b);};function Ec(){}
var Fc=function Fc(b){if(null!=b&&null!=b.T)return b.T(b);var c=Fc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Fc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("ISeqable.-seq",b);};function Gc(){}function Ic(){}function Jc(){}
var Kc=function Kc(b){if(null!=b&&null!=b.nc)return b.nc(b);var c=Kc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Kc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IReversible.-rseq",b);},Lc=function Lc(b,c){if(null!=b&&null!=b.qd)return b.qd(0,c);var d=Lc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Lc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IWriter.-write",b);},Mc=function Mc(b,c,d){if(null!=b&&null!=b.M)return b.M(b,c,d);var e=
Mc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Mc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw E("IPrintWithWriter.-pr-writer",b);},Nc=function Nc(b,c,d){if(null!=b&&null!=b.pd)return b.pd(0,c,d);var e=Nc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Nc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw E("IWatchable.-notify-watches",b);},Oc=function Oc(b){if(null!=b&&null!=b.wb)return b.wb(b);var c=Oc[y(null==b?null:
b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Oc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IEditableCollection.-as-transient",b);},Pc=function Pc(b,c){if(null!=b&&null!=b.Tb)return b.Tb(b,c);var d=Pc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Pc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("ITransientCollection.-conj!",b);},Qc=function Qc(b){if(null!=b&&null!=b.Ub)return b.Ub(b);var c=Qc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Qc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("ITransientCollection.-persistent!",b);},Rc=function Rc(b,c,d){if(null!=b&&null!=b.Sb)return b.Sb(b,c,d);var e=Rc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Rc._;if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw E("ITransientAssociative.-assoc!",b);},Sc=function Sc(b,c,d){if(null!=b&&null!=b.od)return b.od(0,c,d);var e=Sc[y(null==b?null:b)];if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);e=Sc._;
if(null!=e)return e.c?e.c(b,c,d):e.call(null,b,c,d);throw E("ITransientVector.-assoc-n!",b);};function Tc(){}
var Uc=function Uc(b,c){if(null!=b&&null!=b.vb)return b.vb(b,c);var d=Uc[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Uc._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IComparable.-compare",b);},Vc=function Vc(b){if(null!=b&&null!=b.md)return b.md();var c=Vc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Vc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IChunk.-drop-first",b);},Wc=function Wc(b){if(null!=b&&null!=b.Qc)return b.Qc(b);var c=
Wc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Wc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IChunkedSeq.-chunked-first",b);},Xc=function Xc(b){if(null!=b&&null!=b.Rc)return b.Rc(b);var c=Xc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Xc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IChunkedSeq.-chunked-rest",b);},Yc=function Yc(b){if(null!=b&&null!=b.Pc)return b.Pc(b);var c=Yc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,
b);c=Yc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IChunkedNext.-chunked-next",b);},Zc=function Zc(b){if(null!=b&&null!=b.Qb)return b.Qb(b);var c=Zc[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Zc._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("INamed.-name",b);},$c=function $c(b){if(null!=b&&null!=b.Rb)return b.Rb(b);var c=$c[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=$c._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("INamed.-namespace",
b);},ad=function ad(b,c){if(null!=b&&null!=b.le)return b.le(b,c);var d=ad[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=ad._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IReset.-reset!",b);},bd=function bd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return bd.b(arguments[0],arguments[1]);case 3:return bd.c(arguments[0],arguments[1],arguments[2]);case 4:return bd.o(arguments[0],arguments[1],arguments[2],
arguments[3]);case 5:return bd.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};bd.b=function(a,b){if(null!=a&&null!=a.ne)return a.ne(a,b);var c=bd[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=bd._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw E("ISwap.-swap!",a);};
bd.c=function(a,b,c){if(null!=a&&null!=a.oe)return a.oe(a,b,c);var d=bd[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=bd._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw E("ISwap.-swap!",a);};bd.o=function(a,b,c,d){if(null!=a&&null!=a.pe)return a.pe(a,b,c,d);var e=bd[y(null==a?null:a)];if(null!=e)return e.o?e.o(a,b,c,d):e.call(null,a,b,c,d);e=bd._;if(null!=e)return e.o?e.o(a,b,c,d):e.call(null,a,b,c,d);throw E("ISwap.-swap!",a);};
bd.w=function(a,b,c,d,e){if(null!=a&&null!=a.qe)return a.qe(a,b,c,d,e);var f=bd[y(null==a?null:a)];if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);f=bd._;if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);throw E("ISwap.-swap!",a);};bd.A=5;var cd=function cd(b){if(null!=b&&null!=b.Sa)return b.Sa(b);var c=cd[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=cd._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IIterable.-iterator",b);};
function dd(a){this.Te=a;this.i=1073741824;this.C=0}dd.prototype.qd=function(a,b){return this.Te.append(b)};function ed(a){var b=new zb;a.M(null,new dd(b),Gb());return""+G(b)}var fd="undefined"!==typeof Math.imul&&0!==Math.imul(4294967295,5)?function(a,b){return Math.imul(a,b)}:function(a,b){var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};function gd(a){a=fd(a|0,-862048943);return fd(a<<15|a>>>-15,461845907)}
function hd(a,b){var c=(a|0)^(b|0);return fd(c<<13|c>>>-13,5)+-430675100|0}function id(a,b){var c=(a|0)^b,c=fd(c^c>>>16,-2048144789),c=fd(c^c>>>13,-1028477387);return c^c>>>16}function jd(a){var b;a:{b=1;for(var c=0;;)if(b<a.length){var d=b+2,c=hd(c,gd(a.charCodeAt(b-1)|a.charCodeAt(b)<<16));b=d}else{b=c;break a}}b=1===(a.length&1)?b^gd(a.charCodeAt(a.length-1)):b;return id(b,fd(2,a.length))}kd;ld;md;nd;var od={},pd=0;
function qd(a){255<pd&&(od={},pd=0);var b=od[a];if("number"!==typeof b){a:if(null!=a)if(b=a.length,0<b)for(var c=0,d=0;;)if(c<b)var e=c+1,d=fd(31,d)+a.charCodeAt(c),c=e;else{b=d;break a}else b=0;else b=0;od[a]=b;pd+=1}return a=b}function rd(a){null!=a&&(a.i&4194304||a.zf)?a=a.P(null):"number"===typeof a?a=Math.floor(a)%2147483647:!0===a?a=1:!1===a?a=0:"string"===typeof a?(a=qd(a),0!==a&&(a=gd(a),a=hd(0,a),a=id(a,4))):a=a instanceof Date?a.valueOf():null==a?0:Dc(a);return a}
function sd(a,b){return a^b+2654435769+(a<<6)+(a>>2)}function Pb(a,b){return b instanceof a}function td(a,b){if(a.Ra===b.Ra)return 0;var c=Rb(a.ta);if(A(c?b.ta:c))return-1;if(A(a.ta)){if(Rb(b.ta))return 1;c=Ta(a.ta,b.ta);return 0===c?Ta(a.name,b.name):c}return Ta(a.name,b.name)}ud;function ld(a,b,c,d,e){this.ta=a;this.name=b;this.Ra=c;this.sb=d;this.ya=e;this.i=2154168321;this.C=4096}g=ld.prototype;g.toString=function(){return this.Ra};g.equiv=function(a){return this.v(null,a)};
g.v=function(a,b){return b instanceof ld?this.Ra===b.Ra:!1};g.call=function(){function a(a,b,c){return ud.c?ud.c(b,this,c):ud.call(null,b,this,c)}function b(a,b){return ud.b?ud.b(b,this):ud.call(null,b,this)}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,0,e);case 3:return a.call(this,0,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.a=function(a){return ud.b?ud.b(a,this):ud.call(null,a,this)};g.b=function(a,b){return ud.c?ud.c(a,this,b):ud.call(null,a,this,b)};g.S=function(){return this.ya};g.U=function(a,b){return new ld(this.ta,this.name,this.Ra,this.sb,b)};g.P=function(){var a=this.sb;return null!=a?a:this.sb=a=sd(jd(this.name),qd(this.ta))};g.Qb=function(){return this.name};g.Rb=function(){return this.ta};g.M=function(a,b){return Lc(b,this.Ra)};
var vd=function vd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return vd.a(arguments[0]);case 2:return vd.b(arguments[0],arguments[1]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};vd.a=function(a){if(a instanceof ld)return a;var b=a.indexOf("/");return-1===b?vd.b(null,a):vd.b(a.substring(0,b),a.substring(b+1,a.length))};vd.b=function(a,b){var c=null!=a?[G(a),G("/"),G(b)].join(""):b;return new ld(a,b,c,null,null)};
vd.A=2;wd;xd;I;function J(a){if(null==a)return null;if(null!=a&&(a.i&8388608||a.me))return a.T(null);if(Qb(a)||"string"===typeof a)return 0===a.length?null:new I(a,0);if(C(Ec,a))return Fc(a);throw Error([G(a),G(" is not ISeqable")].join(""));}function K(a){if(null==a)return null;if(null!=a&&(a.i&64||a.gb))return a.ca(null);a=J(a);return null==a?null:gc(a)}function yd(a){return null!=a?null!=a&&(a.i&64||a.gb)?a.va(null):(a=J(a))?hc(a):zd:zd}
function L(a){return null==a?null:null!=a&&(a.i&128||a.mc)?a.ua(null):J(yd(a))}var md=function md(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return md.a(arguments[0]);case 2:return md.b(arguments[0],arguments[1]);default:return md.s(arguments[0],arguments[1],new I(c.slice(2),0))}};md.a=function(){return!0};md.b=function(a,b){return null==a?null==b:a===b||Cc(a,b)};
md.s=function(a,b,c){for(;;)if(md.b(a,b))if(L(c))a=b,b=K(c),c=L(c);else return md.b(b,K(c));else return!1};md.G=function(a){var b=K(a),c=L(a);a=K(c);c=L(c);return md.s(b,a,c)};md.A=2;function Ad(a){this.D=a}Ad.prototype.next=function(){if(null!=this.D){var a=K(this.D);this.D=L(this.D);return{value:a,done:!1}}return{value:null,done:!0}};function Bd(a){return new Ad(J(a))}Dd;function Ed(a,b,c){this.value=a;this.Bb=b;this.Ic=c;this.i=8388672;this.C=0}Ed.prototype.T=function(){return this};
Ed.prototype.ca=function(){return this.value};Ed.prototype.va=function(){null==this.Ic&&(this.Ic=Dd.a?Dd.a(this.Bb):Dd.call(null,this.Bb));return this.Ic};function Dd(a){var b=a.next();return A(b.done)?zd:new Ed(b.value,a,null)}function Fd(a,b){var c=gd(a),c=hd(0,c);return id(c,b)}function Gd(a){var b=0,c=1;for(a=J(a);;)if(null!=a)b+=1,c=fd(31,c)+rd(K(a))|0,a=L(a);else return Fd(c,b)}var Hd=Fd(1,0);function Id(a){var b=0,c=0;for(a=J(a);;)if(null!=a)b+=1,c=c+rd(K(a))|0,a=L(a);else return Fd(c,b)}
var Jd=Fd(0,0);Kd;kd;Ld;Yb["null"]=!0;Zb["null"]=function(){return 0};Date.prototype.v=function(a,b){return b instanceof Date&&this.valueOf()===b.valueOf()};Date.prototype.Mb=!0;Date.prototype.vb=function(a,b){if(b instanceof Date)return Ta(this.valueOf(),b.valueOf());throw Error([G("Cannot compare "),G(this),G(" to "),G(b)].join(""));};Cc.number=function(a,b){return a===b};Md;xc["function"]=!0;yc["function"]=function(){return null};Dc._=function(a){return ka(a)};M;
function Nd(a){this.K=a;this.i=32768;this.C=0}Nd.prototype.lc=function(){return this.K};function Od(a){return a instanceof Nd}function M(a){return wc(a)}function Pd(a,b){var c=Zb(a);if(0===c)return b.B?b.B():b.call(null);for(var d=H.b(a,0),e=1;;)if(e<c){var f=H.b(a,e),d=b.b?b.b(d,f):b.call(null,d,f);if(Od(d))return wc(d);e+=1}else return d}function Qd(a,b,c){var d=Zb(a),e=c;for(c=0;;)if(c<d){var f=H.b(a,c),e=b.b?b.b(e,f):b.call(null,e,f);if(Od(e))return wc(e);c+=1}else return e}
function Rd(a,b){var c=a.length;if(0===a.length)return b.B?b.B():b.call(null);for(var d=a[0],e=1;;)if(e<c){var f=a[e],d=b.b?b.b(d,f):b.call(null,d,f);if(Od(d))return wc(d);e+=1}else return d}function Sd(a,b,c){var d=a.length,e=c;for(c=0;;)if(c<d){var f=a[c],e=b.b?b.b(e,f):b.call(null,e,f);if(Od(e))return wc(e);c+=1}else return e}function Td(a,b,c,d){for(var e=a.length;;)if(d<e){var f=a[d];c=b.b?b.b(c,f):b.call(null,c,f);if(Od(c))return wc(c);d+=1}else return c}Ud;N;Vd;Wd;
function Xd(a){return null!=a?a.i&2||a.ae?!0:a.i?!1:C(Yb,a):C(Yb,a)}function Yd(a){return null!=a?a.i&16||a.nd?!0:a.i?!1:C(ec,a):C(ec,a)}function Zd(a,b){this.f=a;this.l=b}Zd.prototype.Ba=function(){return this.l<this.f.length};Zd.prototype.next=function(){var a=this.f[this.l];this.l+=1;return a};function I(a,b){this.f=a;this.l=b;this.i=166199550;this.C=8192}g=I.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};
g.O=function(a,b){var c=b+this.l;return c<this.f.length?this.f[c]:null};g.Aa=function(a,b,c){a=b+this.l;return a<this.f.length?this.f[a]:c};g.Sa=function(){return new Zd(this.f,this.l)};g.ua=function(){return this.l+1<this.f.length?new I(this.f,this.l+1):null};g.Y=function(){var a=this.f.length-this.l;return 0>a?0:a};g.nc=function(){var a=Zb(this);return 0<a?new Vd(this,a-1,null):null};g.P=function(){return Gd(this)};g.v=function(a,b){return Ld.b?Ld.b(this,b):Ld.call(null,this,b)};g.X=function(){return zd};
g.aa=function(a,b){return Td(this.f,b,this.f[this.l],this.l+1)};g.ba=function(a,b,c){return Td(this.f,b,c,this.l)};g.ca=function(){return this.f[this.l]};g.va=function(){return this.l+1<this.f.length?new I(this.f,this.l+1):zd};g.T=function(){return this.l<this.f.length?this:null};g.V=function(a,b){return N.b?N.b(b,this):N.call(null,b,this)};I.prototype[Ub]=function(){return Bd(this)};
var xd=function xd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return xd.a(arguments[0]);case 2:return xd.b(arguments[0],arguments[1]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};xd.a=function(a){return xd.b(a,0)};xd.b=function(a,b){return b<a.length?new I(a,b):null};xd.A=2;
var wd=function wd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return wd.a(arguments[0]);case 2:return wd.b(arguments[0],arguments[1]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};wd.a=function(a){return xd.b(a,0)};wd.b=function(a,b){return xd.b(a,b)};wd.A=2;Md;$d;function Vd(a,b,c){this.kc=a;this.l=b;this.m=c;this.i=32374990;this.C=8192}g=Vd.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};g.ua=function(){return 0<this.l?new Vd(this.kc,this.l-1,null):null};g.Y=function(){return this.l+1};g.P=function(){return Gd(this)};g.v=function(a,b){return Ld.b?Ld.b(this,b):Ld.call(null,this,b)};g.X=function(){var a=zd,b=this.m;return Md.b?Md.b(a,b):Md.call(null,a,b)};g.aa=function(a,b){return $d.b?$d.b(b,this):$d.call(null,b,this)};g.ba=function(a,b,c){return $d.c?$d.c(b,c,this):$d.call(null,b,c,this)};
g.ca=function(){return H.b(this.kc,this.l)};g.va=function(){return 0<this.l?new Vd(this.kc,this.l-1,null):zd};g.T=function(){return this};g.U=function(a,b){return new Vd(this.kc,this.l,b)};g.V=function(a,b){return N.b?N.b(b,this):N.call(null,b,this)};Vd.prototype[Ub]=function(){return Bd(this)};function ae(a){return K(L(a))}Cc._=function(a,b){return a===b};
var be=function be(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return be.B();case 1:return be.a(arguments[0]);case 2:return be.b(arguments[0],arguments[1]);default:return be.s(arguments[0],arguments[1],new I(c.slice(2),0))}};be.B=function(){return ce};be.a=function(a){return a};be.b=function(a,b){return null!=a?dc(a,b):dc(zd,b)};be.s=function(a,b,c){for(;;)if(A(c))a=be.b(a,b),b=K(c),c=L(c);else return be.b(a,b)};
be.G=function(a){var b=K(a),c=L(a);a=K(c);c=L(c);return be.s(b,a,c)};be.A=2;function O(a){if(null!=a)if(null!=a&&(a.i&2||a.ae))a=a.Y(null);else if(Qb(a))a=a.length;else if("string"===typeof a)a=a.length;else if(null!=a&&(a.i&8388608||a.me))a:{a=J(a);for(var b=0;;){if(Xd(a)){a=b+Zb(a);break a}a=L(a);b+=1}}else a=Zb(a);else a=0;return a}function de(a,b){for(var c=null;;){if(null==a)return c;if(0===b)return J(a)?K(a):c;if(Yd(a))return H.c(a,b,c);if(J(a)){var d=L(a),e=b-1;a=d;b=e}else return c}}
function ee(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number");if(null==a)return a;if(null!=a&&(a.i&16||a.nd))return a.O(null,b);if(Qb(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.gb)){var c;a:{c=a;for(var d=b;;){if(null==c)throw Error("Index out of bounds");if(0===d){if(J(c)){c=K(c);break a}throw Error("Index out of bounds");}if(Yd(c)){c=H.b(c,d);break a}if(J(c))c=L(c),--d;else throw Error("Index out of bounds");
}}return c}if(C(ec,a))return H.b(a,b);throw Error([G("nth not supported on this type "),G(Tb(Sb(a)))].join(""));}
function P(a,b){if("number"!==typeof b)throw Error("index argument to nth must be a number.");if(null==a)return null;if(null!=a&&(a.i&16||a.nd))return a.Aa(null,b,null);if(Qb(a))return b<a.length?a[b]:null;if("string"===typeof a)return b<a.length?a.charAt(b):null;if(null!=a&&(a.i&64||a.gb))return de(a,b);if(C(ec,a))return H.b(a,b);throw Error([G("nth not supported on this type "),G(Tb(Sb(a)))].join(""));}
var ud=function ud(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ud.b(arguments[0],arguments[1]);case 3:return ud.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};ud.b=function(a,b){return null==a?null:null!=a&&(a.i&256||a.fe)?a.L(null,b):Qb(a)?b<a.length?a[b|0]:null:"string"===typeof a?b<a.length?a[b|0]:null:C(jc,a)?kc.b(a,b):null};
ud.c=function(a,b,c){return null!=a?null!=a&&(a.i&256||a.fe)?a.H(null,b,c):Qb(a)?b<a.length?a[b]:c:"string"===typeof a?b<a.length?a[b]:c:C(jc,a)?kc.c(a,b,c):c:c};ud.A=3;fe;var ge=function ge(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return ge.c(arguments[0],arguments[1],arguments[2]);default:return ge.s(arguments[0],arguments[1],arguments[2],new I(c.slice(3),0))}};
ge.c=function(a,b,c){if(null!=a)a=mc(a,b,c);else a:{a=[b];c=[c];b=a.length;var d=0,e;for(e=Oc(he);;)if(d<b){var f=d+1;e=e.Sb(null,a[d],c[d]);d=f}else{a=Qc(e);break a}}return a};ge.s=function(a,b,c,d){for(;;)if(a=ge.c(a,b,c),A(d))b=K(d),c=ae(d),d=L(L(d));else return a};ge.G=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),d=L(d);return ge.s(b,a,c,d)};ge.A=3;function ie(a,b){this.g=a;this.m=b;this.i=393217;this.C=0}g=ie.prototype;g.S=function(){return this.m};
g.U=function(a,b){return new ie(this.g,b)};
g.call=function(){function a(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D,F,R){a=this;return Wb.Nb?Wb.Nb(a.g,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D,F,R):Wb.call(null,a.g,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D,F,R)}function b(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D,F){a=this;return a.g.oa?a.g.oa(b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D,F):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D,F)}function c(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D){a=this;return a.g.na?a.g.na(b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,
D):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x,D)}function d(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x){a=this;return a.g.ma?a.g.ma(b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,x)}function e(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z){a=this;return a.g.la?a.g.la(b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z)}function f(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w){a=this;return a.g.ka?a.g.ka(b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w):a.g.call(null,
b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w)}function h(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v){a=this;return a.g.ja?a.g.ja(b,c,d,e,f,h,k,l,n,m,p,q,r,t,v):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v)}function k(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t){a=this;return a.g.ia?a.g.ia(b,c,d,e,f,h,k,l,n,m,p,q,r,t):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r,t)}function l(a,b,c,d,e,f,h,k,l,n,m,p,q,r){a=this;return a.g.ha?a.g.ha(b,c,d,e,f,h,k,l,n,m,p,q,r):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q,r)}function n(a,b,c,d,e,f,h,k,l,n,m,p,q){a=this;
return a.g.ga?a.g.ga(b,c,d,e,f,h,k,l,n,m,p,q):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p,q)}function m(a,b,c,d,e,f,h,k,l,n,m,p){a=this;return a.g.fa?a.g.fa(b,c,d,e,f,h,k,l,n,m,p):a.g.call(null,b,c,d,e,f,h,k,l,n,m,p)}function p(a,b,c,d,e,f,h,k,l,n,m){a=this;return a.g.ea?a.g.ea(b,c,d,e,f,h,k,l,n,m):a.g.call(null,b,c,d,e,f,h,k,l,n,m)}function q(a,b,c,d,e,f,h,k,l,n){a=this;return a.g.qa?a.g.qa(b,c,d,e,f,h,k,l,n):a.g.call(null,b,c,d,e,f,h,k,l,n)}function r(a,b,c,d,e,f,h,k,l){a=this;return a.g.pa?a.g.pa(b,c,
d,e,f,h,k,l):a.g.call(null,b,c,d,e,f,h,k,l)}function t(a,b,c,d,e,f,h,k){a=this;return a.g.W?a.g.W(b,c,d,e,f,h,k):a.g.call(null,b,c,d,e,f,h,k)}function v(a,b,c,d,e,f,h){a=this;return a.g.J?a.g.J(b,c,d,e,f,h):a.g.call(null,b,c,d,e,f,h)}function w(a,b,c,d,e,f){a=this;return a.g.w?a.g.w(b,c,d,e,f):a.g.call(null,b,c,d,e,f)}function z(a,b,c,d,e){a=this;return a.g.o?a.g.o(b,c,d,e):a.g.call(null,b,c,d,e)}function D(a,b,c,d){a=this;return a.g.c?a.g.c(b,c,d):a.g.call(null,b,c,d)}function F(a,b,c){a=this;return a.g.b?
a.g.b(b,c):a.g.call(null,b,c)}function R(a,b){a=this;return a.g.a?a.g.a(b):a.g.call(null,b)}function qa(a){a=this;return a.g.B?a.g.B():a.g.call(null)}var x=null,x=function(Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb,ob,Hb,cc,Hc,Cd,Qf){switch(arguments.length){case 1:return qa.call(this,Da);case 2:return R.call(this,Da,Q);case 3:return F.call(this,Da,Q,T);case 4:return D.call(this,Da,Q,T,X);case 5:return z.call(this,Da,Q,T,X,Y);case 6:return w.call(this,Da,Q,T,X,Y,ca);case 7:return v.call(this,Da,Q,
T,X,Y,ca,ga);case 8:return t.call(this,Da,Q,T,X,Y,ca,ga,ja);case 9:return r.call(this,Da,Q,T,X,Y,ca,ga,ja,la);case 10:return q.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa);case 11:return p.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua);case 12:return m.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya);case 13:return n.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia);case 14:return l.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x);case 15:return k.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra);case 16:return h.call(this,
Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb);case 17:return f.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb,ob);case 18:return e.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb,ob,Hb);case 19:return d.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb,ob,Hb,cc);case 20:return c.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb,ob,Hb,cc,Hc);case 21:return b.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,x,Ra,cb,ob,Hb,cc,Hc,Cd);case 22:return a.call(this,Da,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,
Ia,x,Ra,cb,ob,Hb,cc,Hc,Cd,Qf)}throw Error("Invalid arity: "+arguments.length);};x.a=qa;x.b=R;x.c=F;x.o=D;x.w=z;x.J=w;x.W=v;x.pa=t;x.qa=r;x.ea=q;x.fa=p;x.ga=m;x.ha=n;x.ia=l;x.ja=k;x.ka=h;x.la=f;x.ma=e;x.na=d;x.oa=c;x.Sc=b;x.Nb=a;return x}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.B=function(){return this.g.B?this.g.B():this.g.call(null)};g.a=function(a){return this.g.a?this.g.a(a):this.g.call(null,a)};
g.b=function(a,b){return this.g.b?this.g.b(a,b):this.g.call(null,a,b)};g.c=function(a,b,c){return this.g.c?this.g.c(a,b,c):this.g.call(null,a,b,c)};g.o=function(a,b,c,d){return this.g.o?this.g.o(a,b,c,d):this.g.call(null,a,b,c,d)};g.w=function(a,b,c,d,e){return this.g.w?this.g.w(a,b,c,d,e):this.g.call(null,a,b,c,d,e)};g.J=function(a,b,c,d,e,f){return this.g.J?this.g.J(a,b,c,d,e,f):this.g.call(null,a,b,c,d,e,f)};
g.W=function(a,b,c,d,e,f,h){return this.g.W?this.g.W(a,b,c,d,e,f,h):this.g.call(null,a,b,c,d,e,f,h)};g.pa=function(a,b,c,d,e,f,h,k){return this.g.pa?this.g.pa(a,b,c,d,e,f,h,k):this.g.call(null,a,b,c,d,e,f,h,k)};g.qa=function(a,b,c,d,e,f,h,k,l){return this.g.qa?this.g.qa(a,b,c,d,e,f,h,k,l):this.g.call(null,a,b,c,d,e,f,h,k,l)};g.ea=function(a,b,c,d,e,f,h,k,l,n){return this.g.ea?this.g.ea(a,b,c,d,e,f,h,k,l,n):this.g.call(null,a,b,c,d,e,f,h,k,l,n)};
g.fa=function(a,b,c,d,e,f,h,k,l,n,m){return this.g.fa?this.g.fa(a,b,c,d,e,f,h,k,l,n,m):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m)};g.ga=function(a,b,c,d,e,f,h,k,l,n,m,p){return this.g.ga?this.g.ga(a,b,c,d,e,f,h,k,l,n,m,p):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p)};g.ha=function(a,b,c,d,e,f,h,k,l,n,m,p,q){return this.g.ha?this.g.ha(a,b,c,d,e,f,h,k,l,n,m,p,q):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q)};
g.ia=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r){return this.g.ia?this.g.ia(a,b,c,d,e,f,h,k,l,n,m,p,q,r):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r)};g.ja=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t){return this.g.ja?this.g.ja(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t)};g.ka=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v){return this.g.ka?this.g.ka(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v)};
g.la=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w){return this.g.la?this.g.la(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w)};g.ma=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z){return this.g.ma?this.g.ma(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z)};
g.na=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D){return this.g.na?this.g.na(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D)};g.oa=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F){return this.g.oa?this.g.oa(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F):this.g.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F)};
g.Sc=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R){return Wb.Nb?Wb.Nb(this.g,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R):Wb.call(null,this.g,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R)};function Md(a,b){return ha(a)?new ie(a,b):null==a?null:zc(a,b)}function je(a){var b=null!=a;return(b?null!=a?a.i&131072||a.ie||(a.i?0:C(xc,a)):C(xc,a):b)?yc(a):null}function ke(a){return null==a?!1:null!=a?a.i&8||a.xf?!0:a.i?!1:C(ac,a):C(ac,a)}
function le(a){return null==a?!1:null!=a?a.i&4096||a.Df?!0:a.i?!1:C(rc,a):C(rc,a)}function me(a){return null!=a?a.i&16777216||a.Cf?!0:a.i?!1:C(Gc,a):C(Gc,a)}function ne(a){return null==a?!1:null!=a?a.i&1024||a.ge?!0:a.i?!1:C(nc,a):C(nc,a)}function oe(a){return null!=a?a.i&16384||a.Ef?!0:a.i?!1:C(uc,a):C(uc,a)}pe;qe;function re(a){return null!=a?a.C&512||a.wf?!0:!1:!1}function se(a){var b=[];Ya(a,function(a,b){return function(a,c){return b.push(c)}}(a,b));return b}
function te(a,b,c,d,e){for(;0!==e;)c[d]=a[b],d+=1,--e,b+=1}var ue={};function ve(a){return null==a?!1:null!=a?a.i&64||a.gb?!0:a.i?!1:C(fc,a):C(fc,a)}function we(a){return null==a?!1:!1===a?!1:!0}function xe(a,b){return ud.c(a,b,ue)===ue?!1:!0}
function nd(a,b){if(a===b)return 0;if(null==a)return-1;if(null==b)return 1;if("number"===typeof a){if("number"===typeof b)return Ta(a,b);throw Error([G("Cannot compare "),G(a),G(" to "),G(b)].join(""));}if(null!=a?a.C&2048||a.Mb||(a.C?0:C(Tc,a)):C(Tc,a))return Uc(a,b);if("string"!==typeof a&&!Qb(a)&&!0!==a&&!1!==a||Sb(a)!==Sb(b))throw Error([G("Cannot compare "),G(a),G(" to "),G(b)].join(""));return Ta(a,b)}
function ye(a,b){var c=O(a),d=O(b);if(c<d)c=-1;else if(c>d)c=1;else if(0===c)c=0;else a:for(d=0;;){var e=nd(ee(a,d),ee(b,d));if(0===e&&d+1<c)d+=1;else{c=e;break a}}return c}ze;var $d=function $d(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return $d.b(arguments[0],arguments[1]);case 3:return $d.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
$d.b=function(a,b){var c=J(b);if(c){var d=K(c),c=L(c);return Xb.c?Xb.c(a,d,c):Xb.call(null,a,d,c)}return a.B?a.B():a.call(null)};$d.c=function(a,b,c){for(c=J(c);;)if(c){var d=K(c);b=a.b?a.b(b,d):a.call(null,b,d);if(Od(b))return wc(b);c=L(c)}else return b};$d.A=3;Ae;
var Xb=function Xb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Xb.b(arguments[0],arguments[1]);case 3:return Xb.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};Xb.b=function(a,b){return null!=b&&(b.i&524288||b.ke)?b.aa(null,a):Qb(b)?Rd(b,a):"string"===typeof b?Rd(b,a):C(Ac,b)?Bc.b(b,a):$d.b(a,b)};
Xb.c=function(a,b,c){return null!=c&&(c.i&524288||c.ke)?c.ba(null,a,b):Qb(c)?Sd(c,a,b):"string"===typeof c?Sd(c,a,b):C(Ac,c)?Bc.c(c,a,b):$d.c(a,b,c)};Xb.A=3;function Be(a){return a}function Ce(a,b,c,d){a=a.a?a.a(b):a.call(null,b);c=Xb.c(a,c,d);return a.a?a.a(c):a.call(null,c)}Ab.If;De;function De(a,b){return(a%b+b)%b}function Ee(a){a=(a-a%2)/2;return 0<=a?Math.floor(a):Math.ceil(a)}function Fe(a){a-=a>>1&1431655765;a=(a&858993459)+(a>>2&858993459);return 16843009*(a+(a>>4)&252645135)>>24}
function Ge(a){var b=1;for(a=J(a);;)if(a&&0<b)--b,a=L(a);else return a}var G=function G(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return G.B();case 1:return G.a(arguments[0]);default:return G.s(arguments[0],new I(c.slice(1),0))}};G.B=function(){return""};G.a=function(a){return null==a?"":""+a};G.s=function(a,b){for(var c=new zb(""+G(a)),d=b;;)if(A(d))c=c.append(""+G(K(d))),d=L(d);else return c.toString()};
G.G=function(a){var b=K(a);a=L(a);return G.s(b,a)};G.A=1;He;Ie;function Ld(a,b){var c;if(me(b))if(Xd(a)&&Xd(b)&&O(a)!==O(b))c=!1;else a:{c=J(a);for(var d=J(b);;){if(null==c){c=null==d;break a}if(null!=d&&md.b(K(c),K(d)))c=L(c),d=L(d);else{c=!1;break a}}}else c=null;return we(c)}function Ud(a){if(J(a)){var b=rd(K(a));for(a=L(a);;){if(null==a)return b;b=sd(b,rd(K(a)));a=L(a)}}else return 0}Je;Ke;Ie;Le;Me;
function Wd(a,b,c,d,e){this.m=a;this.first=b;this.xa=c;this.count=d;this.u=e;this.i=65937646;this.C=8192}g=Wd.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};g.ua=function(){return 1===this.count?null:this.xa};g.Y=function(){return this.count};g.hb=function(){return this.first};g.ib=function(){return hc(this)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};
g.X=function(){return zc(zd,this.m)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.first};g.va=function(){return 1===this.count?zd:this.xa};g.T=function(){return this};g.U=function(a,b){return new Wd(b,this.first,this.xa,this.count,this.u)};g.V=function(a,b){return new Wd(this.m,b,this,this.count+1,null)};Wd.prototype[Ub]=function(){return Bd(this)};function Ne(a){this.m=a;this.i=65937614;this.C=8192}g=Ne.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};g.ua=function(){return null};g.Y=function(){return 0};g.hb=function(){return null};g.ib=function(){throw Error("Can't pop empty list");};g.P=function(){return Hd};g.v=function(a,b){return(null!=b?b.i&33554432||b.Af||(b.i?0:C(Ic,b)):C(Ic,b))||me(b)?null==J(b):!1};g.X=function(){return this};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return null};g.va=function(){return zd};
g.T=function(){return null};g.U=function(a,b){return new Ne(b)};g.V=function(a,b){return new Wd(this.m,b,null,1,null)};var zd=new Ne(null);Ne.prototype[Ub]=function(){return Bd(this)};function Oe(a){return(null!=a?a.i&134217728||a.Bf||(a.i?0:C(Jc,a)):C(Jc,a))?Kc(a):Xb.c(be,zd,a)}var kd=function kd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return kd.s(0<c.length?new I(c.slice(0),0):null)};
kd.s=function(a){var b;if(a instanceof I&&0===a.l)b=a.f;else a:for(b=[];;)if(null!=a)b.push(a.ca(null)),a=a.ua(null);else break a;a=b.length;for(var c=zd;;)if(0<a){var d=a-1,c=c.V(null,b[a-1]);a=d}else return c};kd.A=0;kd.G=function(a){return kd.s(J(a))};function Pe(a,b,c,d){this.m=a;this.first=b;this.xa=c;this.u=d;this.i=65929452;this.C=8192}g=Pe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};
g.ua=function(){return null==this.xa?null:J(this.xa)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.m)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.first};g.va=function(){return null==this.xa?zd:this.xa};g.T=function(){return this};g.U=function(a,b){return new Pe(b,this.first,this.xa,this.u)};g.V=function(a,b){return new Pe(null,b,this,this.u)};
Pe.prototype[Ub]=function(){return Bd(this)};function N(a,b){var c=null==b;return(c?c:null!=b&&(b.i&64||b.gb))?new Pe(null,a,b,null):new Pe(null,a,J(b),null)}function Qe(a,b){if(a.Oa===b.Oa)return 0;var c=Rb(a.ta);if(A(c?b.ta:c))return-1;if(A(a.ta)){if(Rb(b.ta))return 1;c=Ta(a.ta,b.ta);return 0===c?Ta(a.name,b.name):c}return Ta(a.name,b.name)}function B(a,b,c,d){this.ta=a;this.name=b;this.Oa=c;this.sb=d;this.i=2153775105;this.C=4096}g=B.prototype;g.toString=function(){return[G(":"),G(this.Oa)].join("")};
g.equiv=function(a){return this.v(null,a)};g.v=function(a,b){return b instanceof B?this.Oa===b.Oa:!1};g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return ud.b(c,this);case 3:return ud.c(c,this,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return ud.b(c,this)};a.c=function(a,c,d){return ud.c(c,this,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return ud.b(a,this)};
g.b=function(a,b){return ud.c(a,this,b)};g.P=function(){var a=this.sb;return null!=a?a:this.sb=a=sd(jd(this.name),qd(this.ta))+2654435769|0};g.Qb=function(){return this.name};g.Rb=function(){return this.ta};g.M=function(a,b){return Lc(b,[G(":"),G(this.Oa)].join(""))};
var Re=function Re(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return Re.a(arguments[0]);case 2:return Re.b(arguments[0],arguments[1]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
Re.a=function(a){if(a instanceof B)return a;if(a instanceof ld){var b;if(null!=a&&(a.C&4096||a.je))b=a.Rb(null);else throw Error([G("Doesn't support namespace: "),G(a)].join(""));return new B(b,Ie.a?Ie.a(a):Ie.call(null,a),a.Ra,null)}return"string"===typeof a?(b=a.split("/"),2===b.length?new B(b[0],b[1],a,null):new B(null,b[0],a,null)):null};Re.b=function(a,b){return new B(a,b,[G(A(a)?[G(a),G("/")].join(""):null),G(b)].join(""),null)};Re.A=2;
function Se(a,b,c,d){this.m=a;this.Na=b;this.D=c;this.u=d;this.i=32374988;this.C=0}g=Se.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};function Te(a){null!=a.Na&&(a.D=a.Na.B?a.Na.B():a.Na.call(null),a.Na=null);return a.D}g.S=function(){return this.m};g.ua=function(){Fc(this);return null==this.D?null:L(this.D)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.m)};
g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){Fc(this);return null==this.D?null:K(this.D)};g.va=function(){Fc(this);return null!=this.D?yd(this.D):zd};g.T=function(){Te(this);if(null==this.D)return null;for(var a=this.D;;)if(a instanceof Se)a=Te(a);else return this.D=a,J(this.D)};g.U=function(a,b){return new Se(b,this.Na,this.D,this.u)};g.V=function(a,b){return N(b,this)};Se.prototype[Ub]=function(){return Bd(this)};Ue;
function Ve(a,b){this.Mc=a;this.end=b;this.i=2;this.C=0}Ve.prototype.add=function(a){this.Mc[this.end]=a;return this.end+=1};Ve.prototype.Fa=function(){var a=new Ue(this.Mc,0,this.end);this.Mc=null;return a};Ve.prototype.Y=function(){return this.end};function Ue(a,b,c){this.f=a;this.da=b;this.end=c;this.i=524306;this.C=0}g=Ue.prototype;g.Y=function(){return this.end-this.da};g.O=function(a,b){return this.f[this.da+b]};g.Aa=function(a,b,c){return 0<=b&&b<this.end-this.da?this.f[this.da+b]:c};
g.md=function(){if(this.da===this.end)throw Error("-drop-first of empty chunk");return new Ue(this.f,this.da+1,this.end)};g.aa=function(a,b){return Td(this.f,b,this.f[this.da],this.da+1)};g.ba=function(a,b,c){return Td(this.f,b,c,this.da)};function pe(a,b,c,d){this.Fa=a;this.Pa=b;this.m=c;this.u=d;this.i=31850732;this.C=1536}g=pe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};
g.ua=function(){if(1<Zb(this.Fa))return new pe(Vc(this.Fa),this.Pa,this.m,null);var a=Fc(this.Pa);return null==a?null:a};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.m)};g.ca=function(){return H.b(this.Fa,0)};g.va=function(){return 1<Zb(this.Fa)?new pe(Vc(this.Fa),this.Pa,this.m,null):null==this.Pa?zd:this.Pa};g.T=function(){return this};g.Qc=function(){return this.Fa};
g.Rc=function(){return null==this.Pa?zd:this.Pa};g.U=function(a,b){return new pe(this.Fa,this.Pa,b,this.u)};g.V=function(a,b){return N(b,this)};g.Pc=function(){return null==this.Pa?null:this.Pa};pe.prototype[Ub]=function(){return Bd(this)};function We(a,b){return 0===Zb(a)?b:new pe(a,b,null,null)}function Xe(a,b){a.add(b)}function Le(a){return Wc(a)}function Me(a){return Xc(a)}function ze(a){for(var b=[];;)if(J(a))b.push(K(a)),a=L(a);else return b}
function Ye(a,b){if(Xd(a))return O(a);for(var c=a,d=b,e=0;;)if(0<d&&J(c))c=L(c),--d,e+=1;else return e}var Ze=function Ze(b){return null==b?null:null==L(b)?J(K(b)):N(K(b),Ze(L(b)))};function $e(a){return Qc(a)}var af=function af(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return af.B();case 1:return af.a(arguments[0]);case 2:return af.b(arguments[0],arguments[1]);default:return af.s(arguments[0],arguments[1],new I(c.slice(2),0))}};
af.B=function(){return Oc(ce)};af.a=function(a){return a};af.b=function(a,b){return Pc(a,b)};af.s=function(a,b,c){for(;;)if(a=Pc(a,b),A(c))b=K(c),c=L(c);else return a};af.G=function(a){var b=K(a),c=L(a);a=K(c);c=L(c);return af.s(b,a,c)};af.A=2;
function bf(a,b,c){var d=J(c);if(0===b)return a.B?a.B():a.call(null);c=gc(d);var e=hc(d);if(1===b)return a.a?a.a(c):a.a?a.a(c):a.call(null,c);var d=gc(e),f=hc(e);if(2===b)return a.b?a.b(c,d):a.b?a.b(c,d):a.call(null,c,d);var e=gc(f),h=hc(f);if(3===b)return a.c?a.c(c,d,e):a.c?a.c(c,d,e):a.call(null,c,d,e);var f=gc(h),k=hc(h);if(4===b)return a.o?a.o(c,d,e,f):a.o?a.o(c,d,e,f):a.call(null,c,d,e,f);var h=gc(k),l=hc(k);if(5===b)return a.w?a.w(c,d,e,f,h):a.w?a.w(c,d,e,f,h):a.call(null,c,d,e,f,h);var k=gc(l),
n=hc(l);if(6===b)return a.J?a.J(c,d,e,f,h,k):a.J?a.J(c,d,e,f,h,k):a.call(null,c,d,e,f,h,k);var l=gc(n),m=hc(n);if(7===b)return a.W?a.W(c,d,e,f,h,k,l):a.W?a.W(c,d,e,f,h,k,l):a.call(null,c,d,e,f,h,k,l);var n=gc(m),p=hc(m);if(8===b)return a.pa?a.pa(c,d,e,f,h,k,l,n):a.pa?a.pa(c,d,e,f,h,k,l,n):a.call(null,c,d,e,f,h,k,l,n);var m=gc(p),q=hc(p);if(9===b)return a.qa?a.qa(c,d,e,f,h,k,l,n,m):a.qa?a.qa(c,d,e,f,h,k,l,n,m):a.call(null,c,d,e,f,h,k,l,n,m);var p=gc(q),r=hc(q);if(10===b)return a.ea?a.ea(c,d,e,f,h,
k,l,n,m,p):a.ea?a.ea(c,d,e,f,h,k,l,n,m,p):a.call(null,c,d,e,f,h,k,l,n,m,p);var q=gc(r),t=hc(r);if(11===b)return a.fa?a.fa(c,d,e,f,h,k,l,n,m,p,q):a.fa?a.fa(c,d,e,f,h,k,l,n,m,p,q):a.call(null,c,d,e,f,h,k,l,n,m,p,q);var r=gc(t),v=hc(t);if(12===b)return a.ga?a.ga(c,d,e,f,h,k,l,n,m,p,q,r):a.ga?a.ga(c,d,e,f,h,k,l,n,m,p,q,r):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r);var t=gc(v),w=hc(v);if(13===b)return a.ha?a.ha(c,d,e,f,h,k,l,n,m,p,q,r,t):a.ha?a.ha(c,d,e,f,h,k,l,n,m,p,q,r,t):a.call(null,c,d,e,f,h,k,l,n,m,p,q,
r,t);var v=gc(w),z=hc(w);if(14===b)return a.ia?a.ia(c,d,e,f,h,k,l,n,m,p,q,r,t,v):a.ia?a.ia(c,d,e,f,h,k,l,n,m,p,q,r,t,v):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r,t,v);var w=gc(z),D=hc(z);if(15===b)return a.ja?a.ja(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w):a.ja?a.ja(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w);var z=gc(D),F=hc(D);if(16===b)return a.ka?a.ka(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z):a.ka?a.ka(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z);var D=gc(F),
R=hc(F);if(17===b)return a.la?a.la(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D):a.la?a.la(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D);var F=gc(R),qa=hc(R);if(18===b)return a.ma?a.ma(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F):a.ma?a.ma(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F);R=gc(qa);qa=hc(qa);if(19===b)return a.na?a.na(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R):a.na?a.na(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R):a.call(null,c,d,e,f,h,k,
l,n,m,p,q,r,t,v,w,z,D,F,R);var x=gc(qa);hc(qa);if(20===b)return a.oa?a.oa(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R,x):a.oa?a.oa(c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R,x):a.call(null,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R,x);throw Error("Only up to 20 arguments supported on functions");}
var Wb=function Wb(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Wb.b(arguments[0],arguments[1]);case 3:return Wb.c(arguments[0],arguments[1],arguments[2]);case 4:return Wb.o(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Wb.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:return Wb.s(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],new I(c.slice(5),0))}};
Wb.b=function(a,b){var c=a.A;if(a.G){var d=Ye(b,c+1);return d<=c?bf(a,d,b):a.G(b)}return a.apply(a,ze(b))};Wb.c=function(a,b,c){b=N(b,c);c=a.A;if(a.G){var d=Ye(b,c+1);return d<=c?bf(a,d,b):a.G(b)}return a.apply(a,ze(b))};Wb.o=function(a,b,c,d){b=N(b,N(c,d));c=a.A;return a.G?(d=Ye(b,c+1),d<=c?bf(a,d,b):a.G(b)):a.apply(a,ze(b))};Wb.w=function(a,b,c,d,e){b=N(b,N(c,N(d,e)));c=a.A;return a.G?(d=Ye(b,c+1),d<=c?bf(a,d,b):a.G(b)):a.apply(a,ze(b))};
Wb.s=function(a,b,c,d,e,f){b=N(b,N(c,N(d,N(e,Ze(f)))));c=a.A;return a.G?(d=Ye(b,c+1),d<=c?bf(a,d,b):a.G(b)):a.apply(a,ze(b))};Wb.G=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),e=L(d),d=K(e),f=L(e),e=K(f),f=L(f);return Wb.s(b,a,c,d,e,f)};Wb.A=5;
var cf=function cf(){"undefined"===typeof Bb&&(Bb=function(b,c){this.Ie=b;this.Ge=c;this.i=393216;this.C=0},Bb.prototype.U=function(b,c){return new Bb(this.Ie,c)},Bb.prototype.S=function(){return this.Ge},Bb.prototype.Ba=function(){return!1},Bb.prototype.next=function(){return Error("No such element")},Bb.prototype.remove=function(){return Error("Unsupported operation")},Bb.Jf=function(){return new S(null,2,5,U,[Md(df,new Ib(null,1,[ef,kd(ff,kd(ce))],null)),Ab.Hf],null)},Bb.rd=!0,Bb.oc="cljs.core/t_cljs$core4904",
Bb.re=function(b){return Lc(b,"cljs.core/t_cljs$core4904")});return new Bb(cf,gf)};hf;function hf(a,b,c,d){this.Gb=a;this.first=b;this.xa=c;this.m=d;this.i=31719628;this.C=0}g=hf.prototype;g.U=function(a,b){return new hf(this.Gb,this.first,this.xa,b)};g.V=function(a,b){return N(b,Fc(this))};g.X=function(){return zd};g.v=function(a,b){return null!=Fc(this)?Ld(this,b):me(b)&&null==J(b)};g.P=function(){return Gd(this)};g.T=function(){null!=this.Gb&&this.Gb.step(this);return null==this.xa?null:this};
g.ca=function(){null!=this.Gb&&Fc(this);return null==this.xa?null:this.first};g.va=function(){null!=this.Gb&&Fc(this);return null==this.xa?zd:this.xa};g.ua=function(){null!=this.Gb&&Fc(this);return null==this.xa?null:Fc(this.xa)};hf.prototype[Ub]=function(){return Bd(this)};function jf(a,b){for(;;){if(null==J(b))return!0;var c;c=K(b);c=a.a?a.a(c):a.call(null,c);if(A(c)){c=a;var d=L(b);a=c;b=d}else return!1}}
function kf(a){for(var b=Be;;)if(J(a)){var c;c=K(a);c=b.a?b.a(c):b.call(null,c);if(A(c))return c;a=L(a)}else return null}var lf=function lf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return lf.B();case 1:return lf.a(arguments[0]);case 2:return lf.b(arguments[0],arguments[1]);case 3:return lf.c(arguments[0],arguments[1],arguments[2]);default:return lf.s(arguments[0],arguments[1],arguments[2],new I(c.slice(3),0))}};lf.B=function(){return Be};
lf.a=function(a){return a};
lf.b=function(a,b){return function(){function c(c,d,e){c=b.c?b.c(c,d,e):b.call(null,c,d,e);return a.a?a.a(c):a.call(null,c)}function d(c,d){var e=b.b?b.b(c,d):b.call(null,c,d);return a.a?a.a(e):a.call(null,e)}function e(c){c=b.a?b.a(c):b.call(null,c);return a.a?a.a(c):a.call(null,c)}function f(){var c=b.B?b.B():b.call(null);return a.a?a.a(c):a.call(null,c)}var h=null,k=function(){function c(a,b,e,f){var h=null;if(3<arguments.length){for(var h=0,k=Array(arguments.length-3);h<k.length;)k[h]=arguments[h+
3],++h;h=new I(k,0)}return d.call(this,a,b,e,h)}function d(c,e,f,h){c=Wb.w(b,c,e,f,h);return a.a?a.a(c):a.call(null,c)}c.A=3;c.G=function(a){var b=K(a);a=L(a);var c=K(a);a=L(a);var e=K(a);a=yd(a);return d(b,c,e,a)};c.s=d;return c}(),h=function(a,b,h,p){switch(arguments.length){case 0:return f.call(this);case 1:return e.call(this,a);case 2:return d.call(this,a,b);case 3:return c.call(this,a,b,h);default:var q=null;if(3<arguments.length){for(var q=0,r=Array(arguments.length-3);q<r.length;)r[q]=arguments[q+
3],++q;q=new I(r,0)}return k.s(a,b,h,q)}throw Error("Invalid arity: "+arguments.length);};h.A=3;h.G=k.G;h.B=f;h.a=e;h.b=d;h.c=c;h.s=k.s;return h}()};
lf.c=function(a,b,c){return function(){function d(d,e,f){d=c.c?c.c(d,e,f):c.call(null,d,e,f);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function e(d,e){var f;f=c.b?c.b(d,e):c.call(null,d,e);f=b.a?b.a(f):b.call(null,f);return a.a?a.a(f):a.call(null,f)}function f(d){d=c.a?c.a(d):c.call(null,d);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}function h(){var d;d=c.B?c.B():c.call(null);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}var k=null,l=function(){function d(a,
b,c,f){var h=null;if(3<arguments.length){for(var h=0,k=Array(arguments.length-3);h<k.length;)k[h]=arguments[h+3],++h;h=new I(k,0)}return e.call(this,a,b,c,h)}function e(d,f,h,k){d=Wb.w(c,d,f,h,k);d=b.a?b.a(d):b.call(null,d);return a.a?a.a(d):a.call(null,d)}d.A=3;d.G=function(a){var b=K(a);a=L(a);var c=K(a);a=L(a);var d=K(a);a=yd(a);return e(b,c,d,a)};d.s=e;return d}(),k=function(a,b,c,k){switch(arguments.length){case 0:return h.call(this);case 1:return f.call(this,a);case 2:return e.call(this,a,b);
case 3:return d.call(this,a,b,c);default:var r=null;if(3<arguments.length){for(var r=0,t=Array(arguments.length-3);r<t.length;)t[r]=arguments[r+3],++r;r=new I(t,0)}return l.s(a,b,c,r)}throw Error("Invalid arity: "+arguments.length);};k.A=3;k.G=l.G;k.B=h;k.a=f;k.b=e;k.c=d;k.s=l.s;return k}()};
lf.s=function(a,b,c,d){return function(a){return function(){function b(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new I(e,0)}return c.call(this,d)}function c(b){b=Wb.b(K(a),b);for(var d=L(a);;)if(d)b=K(d).call(null,b),d=L(d);else return b}b.A=0;b.G=function(a){a=J(a);return c(a)};b.s=c;return b}()}(Oe(N(a,N(b,N(c,d)))))};lf.G=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),d=L(d);return lf.s(b,a,c,d)};lf.A=3;mf;
function nf(a,b,c,d){this.state=a;this.m=b;this.Ze=c;this.Ud=d;this.C=16386;this.i=6455296}g=nf.prototype;g.equiv=function(a){return this.v(null,a)};g.v=function(a,b){return this===b};g.lc=function(){return this.state};g.S=function(){return this.m};
g.pd=function(a,b,c){a=J(this.Ud);for(var d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);h.o?h.o(k,this,b,c):h.call(null,k,this,b,c);f+=1}else if(a=J(a))re(a)?(d=Wc(a),a=Xc(a),k=d,e=O(d),d=k):(d=K(a),k=P(d,0),h=P(d,1),h.o?h.o(k,this,b,c):h.call(null,k,this,b,c),a=L(a),d=null,e=0),f=0;else return null};g.P=function(){return ka(this)};
var V=function V(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return V.a(arguments[0]);default:return V.s(arguments[0],new I(c.slice(1),0))}};V.a=function(a){return new nf(a,null,null,null)};V.s=function(a,b){var c=null!=b&&(b.i&64||b.gb)?Wb.b(Kd,b):b,d=ud.b(c,Lb),c=ud.b(c,of);return new nf(a,d,c,null)};V.G=function(a){var b=K(a);a=L(a);return V.s(b,a)};V.A=1;pf;
function qf(a,b){if(a instanceof nf){var c=a.Ze;if(null!=c&&!A(c.a?c.a(b):c.call(null,b)))throw Error([G("Assert failed: "),G("Validator rejected reference state"),G("\n"),G(function(){var a=kd(rf,sf);return pf.a?pf.a(a):pf.call(null,a)}())].join(""));c=a.state;a.state=b;null!=a.Ud&&Nc(a,c,b);return b}return ad(a,b)}
var tf=function tf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return tf.b(arguments[0],arguments[1]);case 3:return tf.c(arguments[0],arguments[1],arguments[2]);case 4:return tf.o(arguments[0],arguments[1],arguments[2],arguments[3]);default:return tf.s(arguments[0],arguments[1],arguments[2],arguments[3],new I(c.slice(4),0))}};tf.b=function(a,b){var c;a instanceof nf?(c=a.state,c=b.a?b.a(c):b.call(null,c),c=qf(a,c)):c=bd.b(a,b);return c};
tf.c=function(a,b,c){if(a instanceof nf){var d=a.state;b=b.b?b.b(d,c):b.call(null,d,c);a=qf(a,b)}else a=bd.c(a,b,c);return a};tf.o=function(a,b,c,d){if(a instanceof nf){var e=a.state;b=b.c?b.c(e,c,d):b.call(null,e,c,d);a=qf(a,b)}else a=bd.o(a,b,c,d);return a};tf.s=function(a,b,c,d,e){return a instanceof nf?qf(a,Wb.w(b,a.state,c,d,e)):bd.w(a,b,c,d,e)};tf.G=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),e=L(d),d=K(e),e=L(e);return tf.s(b,a,c,d,e)};tf.A=4;
function uf(a){this.state=a;this.i=32768;this.C=0}uf.prototype.lc=function(){return this.state};function mf(a){return new uf(a)}
var He=function He(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return He.a(arguments[0]);case 2:return He.b(arguments[0],arguments[1]);case 3:return He.c(arguments[0],arguments[1],arguments[2]);case 4:return He.o(arguments[0],arguments[1],arguments[2],arguments[3]);default:return He.s(arguments[0],arguments[1],arguments[2],arguments[3],new I(c.slice(4),0))}};
He.a=function(a){return function(b){return function(){function c(c,d){var e=a.a?a.a(d):a.call(null,d);return b.b?b.b(c,e):b.call(null,c,e)}function d(a){return b.a?b.a(a):b.call(null,a)}function e(){return b.B?b.B():b.call(null)}var f=null,h=function(){function c(a,b,e){var f=null;if(2<arguments.length){for(var f=0,h=Array(arguments.length-2);f<h.length;)h[f]=arguments[f+2],++f;f=new I(h,0)}return d.call(this,a,b,f)}function d(c,e,f){e=Wb.c(a,e,f);return b.b?b.b(c,e):b.call(null,c,e)}c.A=2;c.G=function(a){var b=
K(a);a=L(a);var c=K(a);a=yd(a);return d(b,c,a)};c.s=d;return c}(),f=function(a,b,f){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b);default:var m=null;if(2<arguments.length){for(var m=0,p=Array(arguments.length-2);m<p.length;)p[m]=arguments[m+2],++m;m=new I(p,0)}return h.s(a,b,m)}throw Error("Invalid arity: "+arguments.length);};f.A=2;f.G=h.G;f.B=e;f.a=d;f.b=c;f.s=h.s;return f}()}};
He.b=function(a,b){return new Se(null,function(){var c=J(b);if(c){if(re(c)){for(var d=Wc(c),e=O(d),f=new Ve(Array(e),0),h=0;;)if(h<e)Xe(f,function(){var b=H.b(d,h);return a.a?a.a(b):a.call(null,b)}()),h+=1;else break;return We(f.Fa(),He.b(a,Xc(c)))}return N(function(){var b=K(c);return a.a?a.a(b):a.call(null,b)}(),He.b(a,yd(c)))}return null},null,null)};
He.c=function(a,b,c){return new Se(null,function(){var d=J(b),e=J(c);if(d&&e){var f=N,h;h=K(d);var k=K(e);h=a.b?a.b(h,k):a.call(null,h,k);d=f(h,He.c(a,yd(d),yd(e)))}else d=null;return d},null,null)};He.o=function(a,b,c,d){return new Se(null,function(){var e=J(b),f=J(c),h=J(d);if(e&&f&&h){var k=N,l;l=K(e);var n=K(f),m=K(h);l=a.c?a.c(l,n,m):a.call(null,l,n,m);e=k(l,He.o(a,yd(e),yd(f),yd(h)))}else e=null;return e},null,null)};
He.s=function(a,b,c,d,e){var f=function k(a){return new Se(null,function(){var b=He.b(J,a);return jf(Be,b)?N(He.b(K,b),k(He.b(yd,b))):null},null,null)};return He.b(function(){return function(b){return Wb.b(a,b)}}(f),f(be.s(e,d,wd([c,b],0))))};He.G=function(a){var b=K(a),c=L(a);a=K(c);var d=L(c),c=K(d),e=L(d),d=K(e),e=L(e);return He.s(b,a,c,d,e)};He.A=4;vf;
function wf(a,b){return new Se(null,function(){var c=J(b);if(c){if(re(c)){for(var d=Wc(c),e=O(d),f=new Ve(Array(e),0),h=0;;)if(h<e){var k;k=H.b(d,h);k=a.a?a.a(k):a.call(null,k);A(k)&&(k=H.b(d,h),f.add(k));h+=1}else break;return We(f.Fa(),wf(a,Xc(c)))}d=K(c);c=yd(c);return A(a.a?a.a(d):a.call(null,d))?N(d,wf(a,c)):wf(a,c)}return null},null,null)}
var xf=function xf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return xf.b(arguments[0],arguments[1]);case 3:return xf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};xf.b=function(a,b){return null!=a?null!=a&&(a.C&4||a.be)?Md($e(Xb.c(Pc,Oc(a),b)),je(a)):Xb.c(dc,a,b):Xb.c(be,zd,b)};
xf.c=function(a,b,c){return null!=a&&(a.C&4||a.be)?Md($e(Ce(b,af,Oc(a),c)),je(a)):Ce(b,be,a,c)};xf.A=3;function yf(a,b){return $e(Xb.c(function(b,d){return af.b(b,a.a?a.a(d):a.call(null,d))},Oc(ce),b))}function zf(a,b){this.N=a;this.f=b}function Af(a){return new zf(a,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null])}function Bf(a){return new zf(a.N,Vb(a.f))}
function Cf(a){a=a.j;return 32>a?0:a-1>>>5<<5}function Df(a,b,c){for(;;){if(0===b)return c;var d=Af(a);d.f[0]=c;c=d;b-=5}}var Ef=function Ef(b,c,d,e){var f=Bf(d),h=b.j-1>>>c&31;5===c?f.f[h]=e:(d=d.f[h],b=null!=d?Ef(b,c-5,d,e):Df(null,c-5,e),f.f[h]=b);return f};function Ff(a,b){throw Error([G("No item "),G(a),G(" in vector of length "),G(b)].join(""));}function Gf(a,b){if(b>=Cf(a))return a.sa;for(var c=a.root,d=a.shift;;)if(0<d)var e=d-5,c=c.f[b>>>d&31],d=e;else return c.f}
function Hf(a,b){return 0<=b&&b<a.j?Gf(a,b):Ff(b,a.j)}var If=function If(b,c,d,e,f){var h=Bf(d);if(0===c)h.f[e&31]=f;else{var k=e>>>c&31;b=If(b,c-5,d.f[k],e,f);h.f[k]=b}return h},Jf=function Jf(b,c,d){var e=b.j-2>>>c&31;if(5<c){b=Jf(b,c-5,d.f[e]);if(null==b&&0===e)return null;d=Bf(d);d.f[e]=b;return d}if(0===e)return null;d=Bf(d);d.f[e]=null;return d};function Kf(a,b,c,d,e,f){this.l=a;this.ic=b;this.f=c;this.Ga=d;this.start=e;this.end=f}Kf.prototype.Ba=function(){return this.l<this.end};
Kf.prototype.next=function(){32===this.l-this.ic&&(this.f=Gf(this.Ga,this.l),this.ic+=32);var a=this.f[this.l&31];this.l+=1;return a};Lf;Mf;Nf;M;Of;Pf;Rf;function S(a,b,c,d,e,f){this.m=a;this.j=b;this.shift=c;this.root=d;this.sa=e;this.u=f;this.i=167668511;this.C=8196}g=S.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){return"number"===typeof b?H.c(this,b,c):c};
g.O=function(a,b){return Hf(this,b)[b&31]};g.Aa=function(a,b,c){return 0<=b&&b<this.j?Gf(this,b)[b&31]:c};g.jb=function(a,b,c){if(0<=b&&b<this.j)return Cf(this)<=b?(a=Vb(this.sa),a[b&31]=c,new S(this.m,this.j,this.shift,this.root,a,null)):new S(this.m,this.j,this.shift,If(this,this.shift,this.root,b,c),this.sa,null);if(b===this.j)return dc(this,c);throw Error([G("Index "),G(b),G(" out of bounds  [0,"),G(this.j),G("]")].join(""));};
g.Sa=function(){var a=this.j;return new Kf(0,0,0<O(this)?Gf(this,0):null,this,0,a)};g.S=function(){return this.m};g.Y=function(){return this.j};g.Ob=function(){return H.b(this,0)};g.Pb=function(){return H.b(this,1)};g.hb=function(){return 0<this.j?H.b(this,this.j-1):null};
g.ib=function(){if(0===this.j)throw Error("Can't pop empty vector");if(1===this.j)return zc(ce,this.m);if(1<this.j-Cf(this))return new S(this.m,this.j-1,this.shift,this.root,this.sa.slice(0,-1),null);var a=Gf(this,this.j-2),b=Jf(this,this.shift,this.root),b=null==b?U:b,c=this.j-1;return 5<this.shift&&null==b.f[1]?new S(this.m,c,this.shift-5,b.f[0],a,null):new S(this.m,c,this.shift,b,a,null)};g.nc=function(){return 0<this.j?new Vd(this,this.j-1,null):null};
g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){if(b instanceof S)if(this.j===O(b))for(var c=cd(this),d=cd(b);;)if(A(c.Ba())){var e=c.next(),f=d.next();if(!md.b(e,f))return!1}else return!0;else return!1;else return Ld(this,b)};g.wb=function(){return new Nf(this.j,this.shift,Lf.a?Lf.a(this.root):Lf.call(null,this.root),Mf.a?Mf.a(this.sa):Mf.call(null,this.sa))};g.X=function(){return Md(ce,this.m)};g.aa=function(a,b){return Pd(this,b)};
g.ba=function(a,b,c){a=0;for(var d=c;;)if(a<this.j){var e=Gf(this,a);c=e.length;a:for(var f=0;;)if(f<c){var h=e[f],d=b.b?b.b(d,h):b.call(null,d,h);if(Od(d)){e=d;break a}f+=1}else{e=d;break a}if(Od(e))return M.a?M.a(e):M.call(null,e);a+=c;d=e}else return d};g.fb=function(a,b,c){if("number"===typeof b)return vc(this,b,c);throw Error("Vector's key for assoc must be a number.");};
g.T=function(){if(0===this.j)return null;if(32>=this.j)return new I(this.sa,0);var a;a:{a=this.root;for(var b=this.shift;;)if(0<b)b-=5,a=a.f[0];else{a=a.f;break a}}return Rf.o?Rf.o(this,a,0,0):Rf.call(null,this,a,0,0)};g.U=function(a,b){return new S(b,this.j,this.shift,this.root,this.sa,this.u)};
g.V=function(a,b){if(32>this.j-Cf(this)){for(var c=this.sa.length,d=Array(c+1),e=0;;)if(e<c)d[e]=this.sa[e],e+=1;else break;d[c]=b;return new S(this.m,this.j+1,this.shift,this.root,d,null)}c=(d=this.j>>>5>1<<this.shift)?this.shift+5:this.shift;d?(d=Af(null),d.f[0]=this.root,e=Df(null,this.shift,new zf(null,this.sa)),d.f[1]=e):d=Ef(this,this.shift,this.root,new zf(null,this.sa));return new S(this.m,this.j+1,c,d,[b],null)};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.Aa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.Aa(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.O(null,a)};g.b=function(a,b){return this.Aa(null,a,b)};
var U=new zf(null,[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]),ce=new S(null,0,5,U,[],Hd);S.prototype[Ub]=function(){return Bd(this)};function Ae(a){if(Qb(a))a:{var b=a.length;if(32>b)a=new S(null,b,5,U,a,null);else for(var c=32,d=(new S(null,32,5,U,a.slice(0,32),null)).wb(null);;)if(c<b)var e=c+1,d=af.b(d,a[c]),c=e;else{a=Qc(d);break a}}else a=Qc(Xb.c(Pc,Oc(ce),a));return a}Sf;
function qe(a,b,c,d,e,f){this.Ea=a;this.node=b;this.l=c;this.da=d;this.m=e;this.u=f;this.i=32375020;this.C=1536}g=qe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};g.ua=function(){if(this.da+1<this.node.length){var a;a=this.Ea;var b=this.node,c=this.l,d=this.da+1;a=Rf.o?Rf.o(a,b,c,d):Rf.call(null,a,b,c,d);return null==a?null:a}return Yc(this)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};
g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(ce,this.m)};g.aa=function(a,b){var c;c=this.Ea;var d=this.l+this.da,e=O(this.Ea);c=Sf.c?Sf.c(c,d,e):Sf.call(null,c,d,e);return Pd(c,b)};g.ba=function(a,b,c){a=this.Ea;var d=this.l+this.da,e=O(this.Ea);a=Sf.c?Sf.c(a,d,e):Sf.call(null,a,d,e);return Qd(a,b,c)};g.ca=function(){return this.node[this.da]};
g.va=function(){if(this.da+1<this.node.length){var a;a=this.Ea;var b=this.node,c=this.l,d=this.da+1;a=Rf.o?Rf.o(a,b,c,d):Rf.call(null,a,b,c,d);return null==a?zd:a}return Xc(this)};g.T=function(){return this};g.Qc=function(){var a=this.node;return new Ue(a,this.da,a.length)};g.Rc=function(){var a=this.l+this.node.length;if(a<Zb(this.Ea)){var b=this.Ea,c=Gf(this.Ea,a);return Rf.o?Rf.o(b,c,a,0):Rf.call(null,b,c,a,0)}return zd};
g.U=function(a,b){return Rf.w?Rf.w(this.Ea,this.node,this.l,this.da,b):Rf.call(null,this.Ea,this.node,this.l,this.da,b)};g.V=function(a,b){return N(b,this)};g.Pc=function(){var a=this.l+this.node.length;if(a<Zb(this.Ea)){var b=this.Ea,c=Gf(this.Ea,a);return Rf.o?Rf.o(b,c,a,0):Rf.call(null,b,c,a,0)}return null};qe.prototype[Ub]=function(){return Bd(this)};
var Rf=function Rf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 3:return Rf.c(arguments[0],arguments[1],arguments[2]);case 4:return Rf.o(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Rf.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};Rf.c=function(a,b,c){return new qe(a,Hf(a,b),b,c,null,null)};
Rf.o=function(a,b,c,d){return new qe(a,b,c,d,null,null)};Rf.w=function(a,b,c,d,e){return new qe(a,b,c,d,e,null)};Rf.A=5;Tf;function Uf(a,b,c,d,e){this.m=a;this.Ga=b;this.start=c;this.end=d;this.u=e;this.i=167666463;this.C=8192}g=Uf.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){return"number"===typeof b?H.c(this,b,c):c};
g.O=function(a,b){return 0>b||this.end<=this.start+b?Ff(b,this.end-this.start):H.b(this.Ga,this.start+b)};g.Aa=function(a,b,c){return 0>b||this.end<=this.start+b?c:H.c(this.Ga,this.start+b,c)};g.jb=function(a,b,c){var d=this.start+b;a=this.m;c=ge.c(this.Ga,d,c);b=this.start;var e=this.end,d=d+1,d=e>d?e:d;return Tf.w?Tf.w(a,c,b,d,null):Tf.call(null,a,c,b,d,null)};g.S=function(){return this.m};g.Y=function(){return this.end-this.start};g.hb=function(){return H.b(this.Ga,this.end-1)};
g.ib=function(){if(this.start===this.end)throw Error("Can't pop empty vector");var a=this.m,b=this.Ga,c=this.start,d=this.end-1;return Tf.w?Tf.w(a,b,c,d,null):Tf.call(null,a,b,c,d,null)};g.nc=function(){return this.start!==this.end?new Vd(this,this.end-this.start-1,null):null};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(ce,this.m)};g.aa=function(a,b){return Pd(this,b)};g.ba=function(a,b,c){return Qd(this,b,c)};
g.fb=function(a,b,c){if("number"===typeof b)return vc(this,b,c);throw Error("Subvec's key for assoc must be a number.");};g.T=function(){var a=this;return function(b){return function d(e){return e===a.end?null:N(H.b(a.Ga,e),new Se(null,function(){return function(){return d(e+1)}}(b),null,null))}}(this)(a.start)};g.U=function(a,b){return Tf.w?Tf.w(b,this.Ga,this.start,this.end,this.u):Tf.call(null,b,this.Ga,this.start,this.end,this.u)};
g.V=function(a,b){var c=this.m,d=vc(this.Ga,this.end,b),e=this.start,f=this.end+1;return Tf.w?Tf.w(c,d,e,f,null):Tf.call(null,c,d,e,f,null)};g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.O(null,c);case 3:return this.Aa(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.O(null,c)};a.c=function(a,c,d){return this.Aa(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.a=function(a){return this.O(null,a)};g.b=function(a,b){return this.Aa(null,a,b)};Uf.prototype[Ub]=function(){return Bd(this)};function Tf(a,b,c,d,e){for(;;)if(b instanceof Uf)c=b.start+c,d=b.start+d,b=b.Ga;else{var f=O(b);if(0>c||0>d||c>f||d>f)throw Error("Index out of bounds");return new Uf(a,b,c,d,e)}}
var Sf=function Sf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Sf.b(arguments[0],arguments[1]);case 3:return Sf.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};Sf.b=function(a,b){return Sf.c(a,b,O(a))};Sf.c=function(a,b,c){return Tf(null,a,b,c,null)};Sf.A=3;function Vf(a,b){return a===b.N?b:new zf(a,Vb(b.f))}function Lf(a){return new zf({},Vb(a.f))}
function Mf(a){var b=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];te(a,0,b,0,a.length);return b}var Wf=function Wf(b,c,d,e){d=Vf(b.root.N,d);var f=b.j-1>>>c&31;if(5===c)b=e;else{var h=d.f[f];b=null!=h?Wf(b,c-5,h,e):Df(b.root.N,c-5,e)}d.f[f]=b;return d};function Nf(a,b,c,d){this.j=a;this.shift=b;this.root=c;this.sa=d;this.C=88;this.i=275}g=Nf.prototype;
g.Tb=function(a,b){if(this.root.N){if(32>this.j-Cf(this))this.sa[this.j&31]=b;else{var c=new zf(this.root.N,this.sa),d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];d[0]=b;this.sa=d;if(this.j>>>5>1<<this.shift){var d=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],e=this.shift+
5;d[0]=this.root;d[1]=Df(this.root.N,this.shift,c);this.root=new zf(this.root.N,d);this.shift=e}else this.root=Wf(this,this.shift,this.root,c)}this.j+=1;return this}throw Error("conj! after persistent!");};g.Ub=function(){if(this.root.N){this.root.N=null;var a=this.j-Cf(this),b=Array(a);te(this.sa,0,b,0,a);return new S(null,this.j,this.shift,this.root,b,null)}throw Error("persistent! called twice");};
g.Sb=function(a,b,c){if("number"===typeof b)return Sc(this,b,c);throw Error("TransientVector's key for assoc! must be a number.");};
g.od=function(a,b,c){var d=this;if(d.root.N){if(0<=b&&b<d.j)return Cf(this)<=b?d.sa[b&31]=c:(a=function(){return function f(a,k){var l=Vf(d.root.N,k);if(0===a)l.f[b&31]=c;else{var n=b>>>a&31,m=f(a-5,l.f[n]);l.f[n]=m}return l}}(this).call(null,d.shift,d.root),d.root=a),this;if(b===d.j)return Pc(this,c);throw Error([G("Index "),G(b),G(" out of bounds for TransientVector of length"),G(d.j)].join(""));}throw Error("assoc! after persistent!");};
g.Y=function(){if(this.root.N)return this.j;throw Error("count after persistent!");};g.O=function(a,b){if(this.root.N)return Hf(this,b)[b&31];throw Error("nth after persistent!");};g.Aa=function(a,b,c){return 0<=b&&b<this.j?H.b(this,b):c};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){return"number"===typeof b?H.c(this,b,c):c};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.H(null,a,b)};function Xf(){this.i=2097152;this.C=0}
Xf.prototype.equiv=function(a){return this.v(null,a)};Xf.prototype.v=function(){return!1};var Yf=new Xf;function Zf(a,b){return we(ne(b)?O(a)===O(b)?jf(Be,He.b(function(a){return md.b(ud.c(b,K(a),Yf),ae(a))},a)):null:null)}function $f(a){this.D=a}$f.prototype.next=function(){if(null!=this.D){var a=K(this.D),b=P(a,0),a=P(a,1);this.D=L(this.D);return{value:[b,a],done:!1}}return{value:null,done:!0}};function ag(a){return new $f(J(a))}function bg(a){this.D=a}
bg.prototype.next=function(){if(null!=this.D){var a=K(this.D);this.D=L(this.D);return{value:[a,a],done:!1}}return{value:null,done:!0}};
function cg(a,b){var c;if(b instanceof B)a:{c=a.length;for(var d=b.Oa,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof B&&d===a[e].Oa){c=e;break a}e+=2}}else if(fa(b)||"number"===typeof b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(b===a[d]){c=d;break a}d+=2}else if(b instanceof ld)a:for(c=a.length,d=b.Ra,e=0;;){if(c<=e){c=-1;break a}if(a[e]instanceof ld&&d===a[e].Ra){c=e;break a}e+=2}else if(null==b)a:for(c=a.length,d=0;;){if(c<=d){c=-1;break a}if(null==a[d]){c=d;break a}d+=2}else a:for(c=a.length,
d=0;;){if(c<=d){c=-1;break a}if(md.b(b,a[d])){c=d;break a}d+=2}return c}dg;function eg(a,b,c){this.f=a;this.l=b;this.ya=c;this.i=32374990;this.C=0}g=eg.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.ya};g.ua=function(){return this.l<this.f.length-2?new eg(this.f,this.l+2,this.ya):null};g.Y=function(){return(this.f.length-this.l)/2};g.P=function(){return Gd(this)};g.v=function(a,b){return Ld(this,b)};
g.X=function(){return Md(zd,this.ya)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return new S(null,2,5,U,[this.f[this.l],this.f[this.l+1]],null)};g.va=function(){return this.l<this.f.length-2?new eg(this.f,this.l+2,this.ya):zd};g.T=function(){return this};g.U=function(a,b){return new eg(this.f,this.l,b)};g.V=function(a,b){return N(b,this)};eg.prototype[Ub]=function(){return Bd(this)};fg;gg;function hg(a,b,c){this.f=a;this.l=b;this.j=c}
hg.prototype.Ba=function(){return this.l<this.j};hg.prototype.next=function(){var a=new S(null,2,5,U,[this.f[this.l],this.f[this.l+1]],null);this.l+=2;return a};function Ib(a,b,c,d){this.m=a;this.j=b;this.f=c;this.u=d;this.i=16647951;this.C=8196}g=Ib.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.keys=function(){return Bd(fg.a?fg.a(this):fg.call(null,this))};g.entries=function(){return ag(J(this))};
g.values=function(){return Bd(gg.a?gg.a(this):gg.call(null,this))};g.has=function(a){return xe(this,a)};g.get=function(a,b){return this.H(null,a,b)};g.forEach=function(a){for(var b=J(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),h=P(f,0),f=P(f,1);a.b?a.b(f,h):a.call(null,f,h);e+=1}else if(b=J(b))re(b)?(c=Wc(b),b=Xc(b),h=c,d=O(c),c=h):(c=K(b),h=P(c,0),f=P(c,1),a.b?a.b(f,h):a.call(null,f,h),b=L(b),c=null,d=0),e=0;else return null};g.L=function(a,b){return kc.c(this,b,null)};
g.H=function(a,b,c){a=cg(this.f,b);return-1===a?c:this.f[a+1]};g.Sa=function(){return new hg(this.f,0,2*this.j)};g.S=function(){return this.m};g.Y=function(){return this.j};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Id(this)};g.v=function(a,b){if(null!=b&&(b.i&1024||b.ge)){var c=this.f.length;if(this.j===b.Y(null))for(var d=0;;)if(d<c){var e=b.H(null,this.f[d],ue);if(e!==ue)if(md.b(this.f[d+1],e))d+=2;else return!1;else return!1}else return!0;else return!1}else return Zf(this,b)};
g.wb=function(){return new dg({},this.f.length,Vb(this.f))};g.X=function(){return zc(gf,this.m)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.fb=function(a,b,c){a=cg(this.f,b);if(-1===a){if(this.j<ig){a=this.f;for(var d=a.length,e=Array(d+2),f=0;;)if(f<d)e[f]=a[f],f+=1;else break;e[d]=b;e[d+1]=c;return new Ib(this.m,this.j+1,e,null)}return zc(mc(xf.b(he,this),b,c),this.m)}if(c===this.f[a+1])return this;b=Vb(this.f);b[a+1]=c;return new Ib(this.m,this.j,b,null)};
g.Oc=function(a,b){return-1!==cg(this.f,b)};g.T=function(){var a=this.f;return 0<=a.length-2?new eg(a,0,null):null};g.U=function(a,b){return new Ib(b,this.j,this.f,this.u)};g.V=function(a,b){if(oe(b))return mc(this,H.b(b,0),H.b(b,1));for(var c=this,d=J(b);;){if(null==d)return c;var e=K(d);if(oe(e))c=mc(c,H.b(e,0),H.b(e,1)),d=L(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.H(null,a,b)};var gf=new Ib(null,0,[],Jd),ig=8;Ib.prototype[Ub]=function(){return Bd(this)};
jg;function dg(a,b,c){this.zb=a;this.qb=b;this.f=c;this.i=258;this.C=56}g=dg.prototype;g.Y=function(){if(A(this.zb))return Ee(this.qb);throw Error("count after persistent!");};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){if(A(this.zb))return a=cg(this.f,b),-1===a?c:this.f[a+1];throw Error("lookup after persistent!");};
g.Tb=function(a,b){if(A(this.zb)){if(null!=b?b.i&2048||b.he||(b.i?0:C(oc,b)):C(oc,b))return Rc(this,Je.a?Je.a(b):Je.call(null,b),Ke.a?Ke.a(b):Ke.call(null,b));for(var c=J(b),d=this;;){var e=K(c);if(A(e))c=L(c),d=Rc(d,Je.a?Je.a(e):Je.call(null,e),Ke.a?Ke.a(e):Ke.call(null,e));else return d}}else throw Error("conj! after persistent!");};g.Ub=function(){if(A(this.zb))return this.zb=!1,new Ib(null,Ee(this.qb),this.f,null);throw Error("persistent! called twice");};
g.Sb=function(a,b,c){if(A(this.zb)){a=cg(this.f,b);if(-1===a){if(this.qb+2<=2*ig)return this.qb+=2,this.f.push(b),this.f.push(c),this;a=jg.b?jg.b(this.qb,this.f):jg.call(null,this.qb,this.f);return Rc(a,b,c)}c!==this.f[a+1]&&(this.f[a+1]=c);return this}throw Error("assoc! after persistent!");};kg;fe;function jg(a,b){for(var c=Oc(he),d=0;;)if(d<a)c=Rc(c,b[d],b[d+1]),d+=2;else return c}function lg(){this.K=!1}mg;ng;qf;og;V;M;
function pg(a,b){return a===b?!0:a===b||a instanceof B&&b instanceof B&&a.Oa===b.Oa?!0:md.b(a,b)}function qg(a,b,c){a=Vb(a);a[b]=c;return a}function rg(a,b,c,d){a=a.mb(b);a.f[c]=d;return a}sg;function tg(a,b,c,d){this.f=a;this.l=b;this.bc=c;this.La=d}tg.prototype.advance=function(){for(var a=this.f.length;;)if(this.l<a){var b=this.f[this.l],c=this.f[this.l+1];null!=b?b=this.bc=new S(null,2,5,U,[b,c],null):null!=c?(b=cd(c),b=b.Ba()?this.La=b:!1):b=!1;this.l+=2;if(b)return!0}else return!1};
tg.prototype.Ba=function(){var a=null!=this.bc;return a?a:(a=null!=this.La)?a:this.advance()};tg.prototype.next=function(){if(null!=this.bc){var a=this.bc;this.bc=null;return a}if(null!=this.La)return a=this.La.next(),this.La.Ba()||(this.La=null),a;if(this.advance())return this.next();throw Error("No such element");};tg.prototype.remove=function(){return Error("Unsupported operation")};function ug(a,b,c){this.N=a;this.Z=b;this.f=c}g=ug.prototype;
g.mb=function(a){if(a===this.N)return this;var b=Fe(this.Z),c=Array(0>b?4:2*(b+1));te(this.f,0,c,0,2*b);return new ug(a,this.Z,c)};g.Yb=function(){return mg.a?mg.a(this.f):mg.call(null,this.f)};g.bb=function(a,b,c,d){var e=1<<(b>>>a&31);if(0===(this.Z&e))return d;var f=Fe(this.Z&e-1),e=this.f[2*f],f=this.f[2*f+1];return null==e?f.bb(a+5,b,c,d):pg(c,e)?f:d};
g.Ja=function(a,b,c,d,e,f){var h=1<<(c>>>b&31),k=Fe(this.Z&h-1);if(0===(this.Z&h)){var l=Fe(this.Z);if(2*l<this.f.length){a=this.mb(a);b=a.f;f.K=!0;a:for(c=2*(l-k),f=2*k+(c-1),l=2*(k+1)+(c-1);;){if(0===c)break a;b[l]=b[f];--l;--c;--f}b[2*k]=d;b[2*k+1]=e;a.Z|=h;return a}if(16<=l){k=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];k[c>>>b&31]=vg.Ja(a,b+5,c,d,e,f);for(e=d=0;;)if(32>d)0!==
(this.Z>>>d&1)&&(k[d]=null!=this.f[e]?vg.Ja(a,b+5,rd(this.f[e]),this.f[e],this.f[e+1],f):this.f[e+1],e+=2),d+=1;else break;return new sg(a,l+1,k)}b=Array(2*(l+4));te(this.f,0,b,0,2*k);b[2*k]=d;b[2*k+1]=e;te(this.f,2*k,b,2*(k+1),2*(l-k));f.K=!0;a=this.mb(a);a.f=b;a.Z|=h;return a}l=this.f[2*k];h=this.f[2*k+1];if(null==l)return l=h.Ja(a,b+5,c,d,e,f),l===h?this:rg(this,a,2*k+1,l);if(pg(d,l))return e===h?this:rg(this,a,2*k+1,e);f.K=!0;f=b+5;d=og.W?og.W(a,f,l,h,c,d,e):og.call(null,a,f,l,h,c,d,e);e=2*k;
k=2*k+1;a=this.mb(a);a.f[e]=null;a.f[k]=d;return a};
g.Ia=function(a,b,c,d,e){var f=1<<(b>>>a&31),h=Fe(this.Z&f-1);if(0===(this.Z&f)){var k=Fe(this.Z);if(16<=k){h=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];h[b>>>a&31]=vg.Ia(a+5,b,c,d,e);for(d=c=0;;)if(32>c)0!==(this.Z>>>c&1)&&(h[c]=null!=this.f[d]?vg.Ia(a+5,rd(this.f[d]),this.f[d],this.f[d+1],e):this.f[d+1],d+=2),c+=1;else break;return new sg(null,k+1,h)}a=Array(2*(k+1));te(this.f,
0,a,0,2*h);a[2*h]=c;a[2*h+1]=d;te(this.f,2*h,a,2*(h+1),2*(k-h));e.K=!0;return new ug(null,this.Z|f,a)}var l=this.f[2*h],f=this.f[2*h+1];if(null==l)return k=f.Ia(a+5,b,c,d,e),k===f?this:new ug(null,this.Z,qg(this.f,2*h+1,k));if(pg(c,l))return d===f?this:new ug(null,this.Z,qg(this.f,2*h+1,d));e.K=!0;e=this.Z;k=this.f;a+=5;a=og.J?og.J(a,l,f,b,c,d):og.call(null,a,l,f,b,c,d);c=2*h;h=2*h+1;d=Vb(k);d[c]=null;d[h]=a;return new ug(null,e,d)};g.Sa=function(){return new tg(this.f,0,null,null)};
var vg=new ug(null,0,[]);function wg(a,b,c){this.f=a;this.l=b;this.La=c}wg.prototype.Ba=function(){for(var a=this.f.length;;){if(null!=this.La&&this.La.Ba())return!0;if(this.l<a){var b=this.f[this.l];this.l+=1;null!=b&&(this.La=cd(b))}else return!1}};wg.prototype.next=function(){if(this.Ba())return this.La.next();throw Error("No such element");};wg.prototype.remove=function(){return Error("Unsupported operation")};function sg(a,b,c){this.N=a;this.j=b;this.f=c}g=sg.prototype;
g.mb=function(a){return a===this.N?this:new sg(a,this.j,Vb(this.f))};g.Yb=function(){return ng.a?ng.a(this.f):ng.call(null,this.f)};g.bb=function(a,b,c,d){var e=this.f[b>>>a&31];return null!=e?e.bb(a+5,b,c,d):d};g.Ja=function(a,b,c,d,e,f){var h=c>>>b&31,k=this.f[h];if(null==k)return a=rg(this,a,h,vg.Ja(a,b+5,c,d,e,f)),a.j+=1,a;b=k.Ja(a,b+5,c,d,e,f);return b===k?this:rg(this,a,h,b)};
g.Ia=function(a,b,c,d,e){var f=b>>>a&31,h=this.f[f];if(null==h)return new sg(null,this.j+1,qg(this.f,f,vg.Ia(a+5,b,c,d,e)));a=h.Ia(a+5,b,c,d,e);return a===h?this:new sg(null,this.j,qg(this.f,f,a))};g.Sa=function(){return new wg(this.f,0,null)};function xg(a,b,c){b*=2;for(var d=0;;)if(d<b){if(pg(c,a[d]))return d;d+=2}else return-1}function yg(a,b,c,d){this.N=a;this.$a=b;this.j=c;this.f=d}g=yg.prototype;
g.mb=function(a){if(a===this.N)return this;var b=Array(2*(this.j+1));te(this.f,0,b,0,2*this.j);return new yg(a,this.$a,this.j,b)};g.Yb=function(){return mg.a?mg.a(this.f):mg.call(null,this.f)};g.bb=function(a,b,c,d){a=xg(this.f,this.j,c);return 0>a?d:pg(c,this.f[a])?this.f[a+1]:d};
g.Ja=function(a,b,c,d,e,f){if(c===this.$a){b=xg(this.f,this.j,d);if(-1===b){if(this.f.length>2*this.j)return b=2*this.j,c=2*this.j+1,a=this.mb(a),a.f[b]=d,a.f[c]=e,f.K=!0,a.j+=1,a;c=this.f.length;b=Array(c+2);te(this.f,0,b,0,c);b[c]=d;b[c+1]=e;f.K=!0;d=this.j+1;a===this.N?(this.f=b,this.j=d,a=this):a=new yg(this.N,this.$a,d,b);return a}return this.f[b+1]===e?this:rg(this,a,b+1,e)}return(new ug(a,1<<(this.$a>>>b&31),[null,this,null,null])).Ja(a,b,c,d,e,f)};
g.Ia=function(a,b,c,d,e){return b===this.$a?(a=xg(this.f,this.j,c),-1===a?(a=2*this.j,b=Array(a+2),te(this.f,0,b,0,a),b[a]=c,b[a+1]=d,e.K=!0,new yg(null,this.$a,this.j+1,b)):md.b(this.f[a],d)?this:new yg(null,this.$a,this.j,qg(this.f,a+1,d))):(new ug(null,1<<(this.$a>>>a&31),[null,this])).Ia(a,b,c,d,e)};g.Sa=function(){return new tg(this.f,0,null,null)};
var og=function og(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 6:return og.J(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);case 7:return og.W(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5],arguments[6]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
og.J=function(a,b,c,d,e,f){var h=rd(b);if(h===d)return new yg(null,h,2,[b,c,e,f]);var k=new lg;return vg.Ia(a,h,b,c,k).Ia(a,d,e,f,k)};og.W=function(a,b,c,d,e,f,h){var k=rd(c);if(k===e)return new yg(null,k,2,[c,d,f,h]);var l=new lg;return vg.Ja(a,b,k,c,d,l).Ja(a,b,e,f,h,l)};og.A=7;function zg(a,b,c,d,e){this.m=a;this.cb=b;this.l=c;this.D=d;this.u=e;this.i=32374860;this.C=0}g=zg.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};
g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.m)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return null==this.D?new S(null,2,5,U,[this.cb[this.l],this.cb[this.l+1]],null):K(this.D)};
g.va=function(){if(null==this.D){var a=this.cb,b=this.l+2;return mg.c?mg.c(a,b,null):mg.call(null,a,b,null)}var a=this.cb,b=this.l,c=L(this.D);return mg.c?mg.c(a,b,c):mg.call(null,a,b,c)};g.T=function(){return this};g.U=function(a,b){return new zg(b,this.cb,this.l,this.D,this.u)};g.V=function(a,b){return N(b,this)};zg.prototype[Ub]=function(){return Bd(this)};
var mg=function mg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return mg.a(arguments[0]);case 3:return mg.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};mg.a=function(a){return mg.c(a,0,null)};
mg.c=function(a,b,c){if(null==c)for(c=a.length;;)if(b<c){if(null!=a[b])return new zg(null,a,b,null,null);var d=a[b+1];if(A(d)&&(d=d.Yb(),A(d)))return new zg(null,a,b+2,d,null);b+=2}else return null;else return new zg(null,a,b,c,null)};mg.A=3;function Ag(a,b,c,d,e){this.m=a;this.cb=b;this.l=c;this.D=d;this.u=e;this.i=32374860;this.C=0}g=Ag.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.m};
g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.m)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return K(this.D)};g.va=function(){var a=this.cb,b=this.l,c=L(this.D);return ng.o?ng.o(null,a,b,c):ng.call(null,null,a,b,c)};g.T=function(){return this};g.U=function(a,b){return new Ag(b,this.cb,this.l,this.D,this.u)};g.V=function(a,b){return N(b,this)};
Ag.prototype[Ub]=function(){return Bd(this)};var ng=function ng(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 1:return ng.a(arguments[0]);case 4:return ng.o(arguments[0],arguments[1],arguments[2],arguments[3]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};ng.a=function(a){return ng.o(null,a,0,null)};
ng.o=function(a,b,c,d){if(null==d)for(d=b.length;;)if(c<d){var e=b[c];if(A(e)&&(e=e.Yb(),A(e)))return new Ag(a,b,c+1,e,null);c+=1}else return null;else return new Ag(a,b,c,d,null)};ng.A=4;kg;function Bg(a,b,c){this.Da=a;this.Qd=b;this.bd=c}Bg.prototype.Ba=function(){return this.bd&&this.Qd.Ba()};Bg.prototype.next=function(){if(this.bd)return this.Qd.next();this.bd=!0;return this.Da};Bg.prototype.remove=function(){return Error("Unsupported operation")};
function fe(a,b,c,d,e,f){this.m=a;this.j=b;this.root=c;this.Ca=d;this.Da=e;this.u=f;this.i=16123663;this.C=8196}g=fe.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.keys=function(){return Bd(fg.a?fg.a(this):fg.call(null,this))};g.entries=function(){return ag(J(this))};g.values=function(){return Bd(gg.a?gg.a(this):gg.call(null,this))};g.has=function(a){return xe(this,a)};g.get=function(a,b){return this.H(null,a,b)};
g.forEach=function(a){for(var b=J(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),h=P(f,0),f=P(f,1);a.b?a.b(f,h):a.call(null,f,h);e+=1}else if(b=J(b))re(b)?(c=Wc(b),b=Xc(b),h=c,d=O(c),c=h):(c=K(b),h=P(c,0),f=P(c,1),a.b?a.b(f,h):a.call(null,f,h),b=L(b),c=null,d=0),e=0;else return null};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){return null==b?this.Ca?this.Da:c:null==this.root?c:this.root.bb(0,rd(b),b,c)};
g.Sa=function(){var a=this.root?cd(this.root):cf;return this.Ca?new Bg(this.Da,a,!1):a};g.S=function(){return this.m};g.Y=function(){return this.j};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Id(this)};g.v=function(a,b){return Zf(this,b)};g.wb=function(){return new kg({},this.root,this.j,this.Ca,this.Da)};g.X=function(){return zc(he,this.m)};
g.fb=function(a,b,c){if(null==b)return this.Ca&&c===this.Da?this:new fe(this.m,this.Ca?this.j:this.j+1,this.root,!0,c,null);a=new lg;b=(null==this.root?vg:this.root).Ia(0,rd(b),b,c,a);return b===this.root?this:new fe(this.m,a.K?this.j+1:this.j,b,this.Ca,this.Da,null)};g.Oc=function(a,b){return null==b?this.Ca:null==this.root?!1:this.root.bb(0,rd(b),b,ue)!==ue};g.T=function(){if(0<this.j){var a=null!=this.root?this.root.Yb():null;return this.Ca?N(new S(null,2,5,U,[null,this.Da],null),a):a}return null};
g.U=function(a,b){return new fe(b,this.j,this.root,this.Ca,this.Da,this.u)};g.V=function(a,b){if(oe(b))return mc(this,H.b(b,0),H.b(b,1));for(var c=this,d=J(b);;){if(null==d)return c;var e=K(d);if(oe(e))c=mc(c,H.b(e,0),H.b(e,1)),d=L(d);else throw Error("conj on a map takes map entries or seqables of map entries");}};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.H(null,a,b)};var he=new fe(null,0,null,!1,null,Jd);fe.prototype[Ub]=function(){return Bd(this)};
function kg(a,b,c,d,e){this.N=a;this.root=b;this.count=c;this.Ca=d;this.Da=e;this.i=258;this.C=56}function Cg(a,b,c){if(a.N){if(null==b)a.Da!==c&&(a.Da=c),a.Ca||(a.count+=1,a.Ca=!0);else{var d=new lg;b=(null==a.root?vg:a.root).Ja(a.N,0,rd(b),b,c,d);b!==a.root&&(a.root=b);d.K&&(a.count+=1)}return a}throw Error("assoc! after persistent!");}g=kg.prototype;g.Y=function(){if(this.N)return this.count;throw Error("count after persistent!");};
g.L=function(a,b){return null==b?this.Ca?this.Da:null:null==this.root?null:this.root.bb(0,rd(b),b)};g.H=function(a,b,c){return null==b?this.Ca?this.Da:c:null==this.root?c:this.root.bb(0,rd(b),b,c)};
g.Tb=function(a,b){var c;a:if(this.N)if(null!=b?b.i&2048||b.he||(b.i?0:C(oc,b)):C(oc,b))c=Cg(this,Je.a?Je.a(b):Je.call(null,b),Ke.a?Ke.a(b):Ke.call(null,b));else{c=J(b);for(var d=this;;){var e=K(c);if(A(e))c=L(c),d=Cg(d,Je.a?Je.a(e):Je.call(null,e),Ke.a?Ke.a(e):Ke.call(null,e));else{c=d;break a}}}else throw Error("conj! after persistent");return c};g.Ub=function(){var a;if(this.N)this.N=null,a=new fe(null,this.count,this.root,this.Ca,this.Da,null);else throw Error("persistent! called twice");return a};
g.Sb=function(a,b,c){return Cg(this,b,c)};Dg;Eg;function Eg(a,b,c,d,e){this.key=a;this.K=b;this.left=c;this.right=d;this.u=e;this.i=32402207;this.C=0}g=Eg.prototype;g.replace=function(a,b,c,d){return new Eg(a,b,c,d,null)};g.L=function(a,b){return H.c(this,b,null)};g.H=function(a,b,c){return H.c(this,b,c)};g.O=function(a,b){return 0===b?this.key:1===b?this.K:null};g.Aa=function(a,b,c){return 0===b?this.key:1===b?this.K:c};
g.jb=function(a,b,c){return(new S(null,2,5,U,[this.key,this.K],null)).jb(null,b,c)};g.S=function(){return null};g.Y=function(){return 2};g.Ob=function(){return this.key};g.Pb=function(){return this.K};g.hb=function(){return this.K};g.ib=function(){return new S(null,1,5,U,[this.key],null)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return ce};g.aa=function(a,b){return Pd(this,b)};g.ba=function(a,b,c){return Qd(this,b,c)};
g.fb=function(a,b,c){return ge.c(new S(null,2,5,U,[this.key,this.K],null),b,c)};g.T=function(){return dc(dc(zd,this.K),this.key)};g.U=function(a,b){return Md(new S(null,2,5,U,[this.key,this.K],null),b)};g.V=function(a,b){return new S(null,3,5,U,[this.key,this.K,b],null)};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.H(null,a,b)};Eg.prototype[Ub]=function(){return Bd(this)};
function Dg(a,b,c,d,e){this.key=a;this.K=b;this.left=c;this.right=d;this.u=e;this.i=32402207;this.C=0}g=Dg.prototype;g.replace=function(a,b,c,d){return new Dg(a,b,c,d,null)};g.L=function(a,b){return H.c(this,b,null)};g.H=function(a,b,c){return H.c(this,b,c)};g.O=function(a,b){return 0===b?this.key:1===b?this.K:null};g.Aa=function(a,b,c){return 0===b?this.key:1===b?this.K:c};g.jb=function(a,b,c){return(new S(null,2,5,U,[this.key,this.K],null)).jb(null,b,c)};g.S=function(){return null};g.Y=function(){return 2};
g.Ob=function(){return this.key};g.Pb=function(){return this.K};g.hb=function(){return this.K};g.ib=function(){return new S(null,1,5,U,[this.key],null)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return ce};g.aa=function(a,b){return Pd(this,b)};g.ba=function(a,b,c){return Qd(this,b,c)};g.fb=function(a,b,c){return ge.c(new S(null,2,5,U,[this.key,this.K],null),b,c)};g.T=function(){return dc(dc(zd,this.K),this.key)};
g.U=function(a,b){return Md(new S(null,2,5,U,[this.key,this.K],null),b)};g.V=function(a,b){return new S(null,3,5,U,[this.key,this.K,b],null)};g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.H(null,a,b)};Dg.prototype[Ub]=function(){return Bd(this)};Je;var Kd=function Kd(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Kd.s(0<c.length?new I(c.slice(0),0):null)};Kd.s=function(a){for(var b=J(a),c=Oc(he);;)if(b){a=L(L(b));var d=K(b),b=ae(b),c=Rc(c,d,b),b=a}else return Qc(c)};Kd.A=0;Kd.G=function(a){return Kd.s(J(a))};
var Fg=function Fg(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return Fg.s(0<c.length?new I(c.slice(0),0):null)};Fg.s=function(a){a=a instanceof I&&0===a.l?a.f:Ob.a(a);for(var b=[],c=0;;)if(c<a.length){var d=a[c],e=a[c+1];-1===cg(b,d)&&(b.push(d),b.push(e));c+=2}else break;return new Ib(null,b.length/2,b,null)};Fg.A=0;Fg.G=function(a){return Fg.s(J(a))};function Gg(a,b){this.F=a;this.ya=b;this.i=32374988;this.C=0}g=Gg.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.ya};g.ua=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null==a?null:new Gg(a,this.ya)};g.P=function(){return Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.ya)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.F.ca(null).Ob(null)};
g.va=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null!=a?new Gg(a,this.ya):zd};g.T=function(){return this};g.U=function(a,b){return new Gg(this.F,b)};g.V=function(a,b){return N(b,this)};Gg.prototype[Ub]=function(){return Bd(this)};function fg(a){return(a=J(a))?new Gg(a,null):null}function Je(a){return pc(a)}function Hg(a,b){this.F=a;this.ya=b;this.i=32374988;this.C=0}g=Hg.prototype;g.toString=function(){return ed(this)};
g.equiv=function(a){return this.v(null,a)};g.S=function(){return this.ya};g.ua=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null==a?null:new Hg(a,this.ya)};g.P=function(){return Gd(this)};g.v=function(a,b){return Ld(this,b)};g.X=function(){return Md(zd,this.ya)};g.aa=function(a,b){return $d.b(b,this)};g.ba=function(a,b,c){return $d.c(b,c,this)};g.ca=function(){return this.F.ca(null).Pb(null)};
g.va=function(){var a=(null!=this.F?this.F.i&128||this.F.mc||(this.F.i?0:C(ic,this.F)):C(ic,this.F))?this.F.ua(null):L(this.F);return null!=a?new Hg(a,this.ya):zd};g.T=function(){return this};g.U=function(a,b){return new Hg(this.F,b)};g.V=function(a,b){return N(b,this)};Hg.prototype[Ub]=function(){return Bd(this)};function gg(a){return(a=J(a))?new Hg(a,null):null}function Ke(a){return qc(a)}function Ig(a){return A(kf(a))?Xb.b(function(a,c){return be.b(A(a)?a:gf,c)},a):null}Jg;
function Kg(a){this.Bb=a}Kg.prototype.Ba=function(){return this.Bb.Ba()};Kg.prototype.next=function(){if(this.Bb.Ba())return this.Bb.next().sa[0];throw Error("No such element");};Kg.prototype.remove=function(){return Error("Unsupported operation")};function Lg(a,b,c){this.m=a;this.ob=b;this.u=c;this.i=15077647;this.C=8196}g=Lg.prototype;g.toString=function(){return ed(this)};g.equiv=function(a){return this.v(null,a)};g.keys=function(){return Bd(J(this))};g.entries=function(){var a=J(this);return new bg(J(a))};
g.values=function(){return Bd(J(this))};g.has=function(a){return xe(this,a)};g.forEach=function(a){for(var b=J(this),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e),h=P(f,0),f=P(f,1);a.b?a.b(f,h):a.call(null,f,h);e+=1}else if(b=J(b))re(b)?(c=Wc(b),b=Xc(b),h=c,d=O(c),c=h):(c=K(b),h=P(c,0),f=P(c,1),a.b?a.b(f,h):a.call(null,f,h),b=L(b),c=null,d=0),e=0;else return null};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){return lc(this.ob,b)?b:c};g.Sa=function(){return new Kg(cd(this.ob))};
g.S=function(){return this.m};g.Y=function(){return Zb(this.ob)};g.P=function(){var a=this.u;return null!=a?a:this.u=a=Id(this)};g.v=function(a,b){return le(b)&&O(this)===O(b)&&jf(function(a){return function(b){return xe(a,b)}}(this),b)};g.wb=function(){return new Jg(Oc(this.ob))};g.X=function(){return Md(Mg,this.m)};g.T=function(){return fg(this.ob)};g.U=function(a,b){return new Lg(b,this.ob,this.u)};g.V=function(a,b){return new Lg(this.m,ge.c(this.ob,b,null),null)};
g.call=function(){var a=null,a=function(a,c,d){switch(arguments.length){case 2:return this.L(null,c);case 3:return this.H(null,c,d)}throw Error("Invalid arity: "+arguments.length);};a.b=function(a,c){return this.L(null,c)};a.c=function(a,c,d){return this.H(null,c,d)};return a}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return this.L(null,a)};g.b=function(a,b){return this.H(null,a,b)};var Mg=new Lg(null,gf,Jd);Lg.prototype[Ub]=function(){return Bd(this)};
function Jg(a){this.Wa=a;this.C=136;this.i=259}g=Jg.prototype;g.Tb=function(a,b){this.Wa=Rc(this.Wa,b,null);return this};g.Ub=function(){return new Lg(null,Qc(this.Wa),null)};g.Y=function(){return O(this.Wa)};g.L=function(a,b){return kc.c(this,b,null)};g.H=function(a,b,c){return kc.c(this.Wa,b,ue)===ue?c:b};
g.call=function(){function a(a,b,c){return kc.c(this.Wa,b,ue)===ue?c:b}function b(a,b){return kc.c(this.Wa,b,ue)===ue?null:b}var c=null,c=function(c,e,f){switch(arguments.length){case 2:return b.call(this,c,e);case 3:return a.call(this,c,e,f)}throw Error("Invalid arity: "+arguments.length);};c.b=b;c.c=a;return c}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};g.a=function(a){return kc.c(this.Wa,a,ue)===ue?null:a};g.b=function(a,b){return kc.c(this.Wa,a,ue)===ue?b:a};
function Ie(a){if(null!=a&&(a.C&4096||a.je))return a.Qb(null);if("string"===typeof a)return a;throw Error([G("Doesn't support name: "),G(a)].join(""));}function Ng(a){a:for(var b=a;;)if(J(b))b=L(b);else break a;return a}function Og(a,b){if("string"===typeof b){var c=a.exec(b);return md.b(K(c),b)?1===O(c)?K(c):Ae(c):null}throw new TypeError("re-matches must match against a string.");}
function Of(a,b,c,d,e,f,h){var k=Eb;Eb=null==Eb?null:Eb-1;try{if(null!=Eb&&0>Eb)return Lc(a,"#");Lc(a,c);if(0===Nb.a(f))J(h)&&Lc(a,function(){var a=Pg.a(f);return A(a)?a:"..."}());else{if(J(h)){var l=K(h);b.c?b.c(l,a,f):b.call(null,l,a,f)}for(var n=L(h),m=Nb.a(f)-1;;)if(!n||null!=m&&0===m){J(n)&&0===m&&(Lc(a,d),Lc(a,function(){var a=Pg.a(f);return A(a)?a:"..."}()));break}else{Lc(a,d);var p=K(n);c=a;h=f;b.c?b.c(p,c,h):b.call(null,p,c,h);var q=L(n);c=m-1;n=q;m=c}}return Lc(a,e)}finally{Eb=k}}
function Qg(a,b){for(var c=J(b),d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f);Lc(a,h);f+=1}else if(c=J(c))d=c,re(d)?(c=Wc(d),e=Xc(d),d=c,h=O(c),c=e,e=h):(h=K(d),Lc(a,h),c=L(d),d=null,e=0),f=0;else return null}var Rg={'"':'\\"',"\\":"\\\\","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t"};function Sg(a){return[G('"'),G(a.replace(RegExp('[\\\\"\b\f\n\r\t]',"g"),function(a){return Rg[a]})),G('"')].join("")}Tg;
function Ug(a,b){var c=we(ud.b(a,Lb));return c?(c=null!=b?b.i&131072||b.ie?!0:!1:!1)?null!=je(b):c:c}
function Vg(a,b,c){if(null==a)return Lc(b,"nil");if(Ug(c,a)){Lc(b,"^");var d=je(a);Pf.c?Pf.c(d,b,c):Pf.call(null,d,b,c);Lc(b," ")}if(a.rd)return a.re(b);if(null!=a&&(a.i&2147483648||a.R))return a.M(null,b,c);if(!0===a||!1===a||"number"===typeof a)return Lc(b,""+G(a));if(null!=a&&a.constructor===Object)return Lc(b,"#js "),d=He.b(function(b){return new S(null,2,5,U,[Re.a(b),a[b]],null)},se(a)),Tg.o?Tg.o(d,Pf,b,c):Tg.call(null,d,Pf,b,c);if(Qb(a))return Of(b,Pf,"#js ["," ","]",c,a);if(fa(a))return A(Kb.a(c))?
Lc(b,Sg(a)):Lc(b,a);if(ha(a)){var e=a.name;c=A(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Function":e;return Qg(b,wd(["#object[",c,' "',""+G(a),'"]'],0))}if(a instanceof Date)return c=function(a,b){for(var c=""+G(a);;)if(O(c)<b)c=[G("0"),G(c)].join("");else return c},Qg(b,wd(['#inst "',""+G(a.getUTCFullYear()),"-",c(a.getUTCMonth()+1,2),"-",c(a.getUTCDate(),2),"T",c(a.getUTCHours(),2),":",c(a.getUTCMinutes(),2),":",c(a.getUTCSeconds(),2),".",c(a.getUTCMilliseconds(),3),"-",'00:00"'],
0));if(a instanceof RegExp)return Qg(b,wd(['#"',a.source,'"'],0));if(null!=a&&(a.i&2147483648||a.R))return Mc(a,b,c);if(A(a.constructor.oc))return Qg(b,wd(["#object[",a.constructor.oc.replace(RegExp("/","g"),"."),"]"],0));e=a.constructor.name;c=A(function(){var a=null==e;return a?a:/^[\s\xa0]*$/.test(e)}())?"Object":e;return Qg(b,wd(["#object[",c," ",""+G(a),"]"],0))}function Pf(a,b,c){var d=Wg.a(c);return A(d)?(c=ge.c(c,Xg,Vg),d.c?d.c(a,b,c):d.call(null,a,b,c)):Vg(a,b,c)}
var pf=function pf(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;return pf.s(0<c.length?new I(c.slice(0),0):null)};pf.s=function(a){var b=Gb();if(null==a||Rb(J(a)))b="";else{var c=G,d=new zb;a:{var e=new dd(d);Pf(K(a),e,b);a=J(L(a));for(var f=null,h=0,k=0;;)if(k<h){var l=f.O(null,k);Lc(e," ");Pf(l,e,b);k+=1}else if(a=J(a))f=a,re(f)?(a=Wc(f),h=Xc(f),f=a,l=O(a),a=h,h=l):(l=K(f),Lc(e," "),Pf(l,e,b),a=L(f),f=null,h=0),k=0;else break a}b=""+c(d)}return b};pf.A=0;
pf.G=function(a){return pf.s(J(a))};function Tg(a,b,c,d){return Of(c,function(a,c,d){var k=pc(a);b.c?b.c(k,c,d):b.call(null,k,c,d);Lc(c," ");a=qc(a);return b.c?b.c(a,c,d):b.call(null,a,c,d)},"{",", ","}",d,J(a))}uf.prototype.R=!0;uf.prototype.M=function(a,b,c){Lc(b,"#object [cljs.core.Volatile ");Pf(new Ib(null,1,[Yg,this.state],null),b,c);return Lc(b,"]")};I.prototype.R=!0;I.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Se.prototype.R=!0;
Se.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};zg.prototype.R=!0;zg.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Eg.prototype.R=!0;Eg.prototype.M=function(a,b,c){return Of(b,Pf,"["," ","]",c,this)};eg.prototype.R=!0;eg.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Ed.prototype.R=!0;Ed.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};qe.prototype.R=!0;qe.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};
Pe.prototype.R=!0;Pe.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Vd.prototype.R=!0;Vd.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};fe.prototype.R=!0;fe.prototype.M=function(a,b,c){return Tg(this,Pf,b,c)};Ag.prototype.R=!0;Ag.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Uf.prototype.R=!0;Uf.prototype.M=function(a,b,c){return Of(b,Pf,"["," ","]",c,this)};Lg.prototype.R=!0;Lg.prototype.M=function(a,b,c){return Of(b,Pf,"#{"," ","}",c,this)};
pe.prototype.R=!0;pe.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};nf.prototype.R=!0;nf.prototype.M=function(a,b,c){Lc(b,"#object [cljs.core.Atom ");Pf(new Ib(null,1,[Yg,this.state],null),b,c);return Lc(b,"]")};Hg.prototype.R=!0;Hg.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Dg.prototype.R=!0;Dg.prototype.M=function(a,b,c){return Of(b,Pf,"["," ","]",c,this)};S.prototype.R=!0;S.prototype.M=function(a,b,c){return Of(b,Pf,"["," ","]",c,this)};Ne.prototype.R=!0;
Ne.prototype.M=function(a,b){return Lc(b,"()")};hf.prototype.R=!0;hf.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Ib.prototype.R=!0;Ib.prototype.M=function(a,b,c){return Tg(this,Pf,b,c)};Gg.prototype.R=!0;Gg.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};Wd.prototype.R=!0;Wd.prototype.M=function(a,b,c){return Of(b,Pf,"("," ",")",c,this)};ld.prototype.Mb=!0;
ld.prototype.vb=function(a,b){if(b instanceof ld)return td(this,b);throw Error([G("Cannot compare "),G(this),G(" to "),G(b)].join(""));};B.prototype.Mb=!0;B.prototype.vb=function(a,b){if(b instanceof B)return Qe(this,b);throw Error([G("Cannot compare "),G(this),G(" to "),G(b)].join(""));};Uf.prototype.Mb=!0;Uf.prototype.vb=function(a,b){if(oe(b))return ye(this,b);throw Error([G("Cannot compare "),G(this),G(" to "),G(b)].join(""));};S.prototype.Mb=!0;
S.prototype.vb=function(a,b){if(oe(b))return ye(this,b);throw Error([G("Cannot compare "),G(this),G(" to "),G(b)].join(""));};function Zg(a){return function(b,c){var d=a.b?a.b(b,c):a.call(null,b,c);return Od(d)?new Nd(d):d}}
function vf(a){return function(b){return function(){function c(a,c){return Xb.c(b,a,c)}function d(b){return a.a?a.a(b):a.call(null,b)}function e(){return a.B?a.B():a.call(null)}var f=null,f=function(a,b){switch(arguments.length){case 0:return e.call(this);case 1:return d.call(this,a);case 2:return c.call(this,a,b)}throw Error("Invalid arity: "+arguments.length);};f.B=e;f.a=d;f.b=c;return f}()}(Zg(a))}$g;function ah(){}
var bh=function bh(b){if(null!=b&&null!=b.ee)return b.ee(b);var c=bh[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=bh._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("IEncodeJS.-clj-\x3ejs",b);};ch;function dh(a){return(null!=a?a.de||(a.xb?0:C(ah,a)):C(ah,a))?bh(a):"string"===typeof a||"number"===typeof a||a instanceof B||a instanceof ld?ch.a?ch.a(a):ch.call(null,a):pf.s(wd([a],0))}
var ch=function ch(b){if(null==b)return null;if(null!=b?b.de||(b.xb?0:C(ah,b)):C(ah,b))return bh(b);if(b instanceof B)return Ie(b);if(b instanceof ld)return""+G(b);if(ne(b)){var c={};b=J(b);for(var d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);c[dh(k)]=ch(h);f+=1}else if(b=J(b))re(b)?(e=Wc(b),b=Xc(b),d=e,e=O(e)):(e=K(b),d=P(e,0),e=P(e,1),c[dh(d)]=ch(e),b=L(b),d=null,e=0),f=0;else break;return c}if(ke(b)){c=[];b=J(He.b(ch,b));d=null;for(f=e=0;;)if(f<e)k=d.O(null,f),c.push(k),f+=1;else if(b=
J(b))d=b,re(d)?(b=Wc(d),f=Xc(d),d=b,e=O(b),b=f):(b=K(d),c.push(b),b=L(d),d=null,e=0),f=0;else break;return c}return b};function eh(){}var fh=function fh(b,c){if(null!=b&&null!=b.ce)return b.ce(b,c);var d=fh[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=fh._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("IEncodeClojure.-js-\x3eclj",b);};
function gh(a){var b=wd([new Ib(null,1,[hh,!1],null)],0),c=null!=b&&(b.i&64||b.gb)?Wb.b(Kd,b):b,d=ud.b(c,hh);return function(a,c,d,k){return function n(m){return(null!=m?m.yf||(m.xb?0:C(eh,m)):C(eh,m))?fh(m,Wb.b(Fg,b)):ve(m)?Ng(He.b(n,m)):ke(m)?xf.b(null==m?null:$b(m),He.b(n,m)):Qb(m)?Ae(He.b(n,m)):Sb(m)===Object?xf.b(gf,function(){return function(a,b,c,d){return function w(e){return new Se(null,function(a,b,c,d){return function(){for(;;){var a=J(e);if(a){if(re(a)){var b=Wc(a),c=O(b),f=new Ve(Array(c),
0);a:for(var h=0;;)if(h<c){var k=H.b(b,h),k=new S(null,2,5,U,[d.a?d.a(k):d.call(null,k),n(m[k])],null);f.add(k);h+=1}else{b=!0;break a}return b?We(f.Fa(),w(Xc(a))):We(f.Fa(),null)}f=K(a);return N(new S(null,2,5,U,[d.a?d.a(f):d.call(null,f),n(m[f])],null),w(yd(a)))}return null}}}(a,b,c,d),null,null)}}(a,c,d,k)(se(m))}()):m}}(b,c,d,A(d)?Re:G)(a)}
var $g=function $g(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 0:return $g.B();case 1:return $g.a(arguments[0]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};$g.B=function(){return $g.a(1)};$g.a=function(a){return Math.random()*a};$g.A=1;var ih=null;function jh(){if(null==ih){var a=new Ib(null,3,[kh,gf,lh,gf,mh,gf],null);ih=V.a?V.a(a):V.call(null,a)}return ih}
function nh(a,b,c){var d=md.b(b,c);if(!d&&!(d=xe(mh.a(a).call(null,b),c))&&(d=oe(c))&&(d=oe(b)))if(d=O(c)===O(b))for(var d=!0,e=0;;)if(d&&e!==O(c))d=nh(a,b.a?b.a(e):b.call(null,e),c.a?c.a(e):c.call(null,e)),e+=1;else return d;else return d;else return d}function oh(a){var b;b=jh();b=M.a?M.a(b):M.call(null,b);a=ud.b(kh.a(b),a);return J(a)?a:null}function ph(a,b,c,d){tf.b(a,function(){return M.a?M.a(b):M.call(null,b)});tf.b(c,function(){return M.a?M.a(d):M.call(null,d)})}
var qh=function qh(b,c,d){var e=(M.a?M.a(d):M.call(null,d)).call(null,b),e=A(A(e)?e.a?e.a(c):e.call(null,c):e)?!0:null;if(A(e))return e;e=function(){for(var e=oh(c);;)if(0<O(e))qh(b,K(e),d),e=yd(e);else return null}();if(A(e))return e;e=function(){for(var e=oh(b);;)if(0<O(e))qh(K(e),c,d),e=yd(e);else return null}();return A(e)?e:!1};function rh(a,b,c){c=qh(a,b,c);if(A(c))a=c;else{c=nh;var d;d=jh();d=M.a?M.a(d):M.call(null,d);a=c(d,a,b)}return a}
var sh=function sh(b,c,d,e,f,h,k){var l=Xb.c(function(e,h){var k=P(h,0);P(h,1);if(nh(M.a?M.a(d):M.call(null,d),c,k)){var l;l=(l=null==e)?l:rh(k,K(e),f);l=A(l)?h:e;if(!A(rh(K(l),k,f)))throw Error([G("Multiple methods in multimethod '"),G(b),G("' match dispatch value: "),G(c),G(" -\x3e "),G(k),G(" and "),G(K(l)),G(", and neither is preferred")].join(""));return l}return e},null,M.a?M.a(e):M.call(null,e));if(A(l)){if(md.b(M.a?M.a(k):M.call(null,k),M.a?M.a(d):M.call(null,d)))return tf.o(h,ge,c,ae(l)),
ae(l);ph(h,e,k,d);return sh(b,c,d,e,f,h,k)}return null};function W(a,b){throw Error([G("No method in multimethod '"),G(a),G("' for dispatch value: "),G(b)].join(""));}function th(a,b,c,d,e,f,h,k){this.name=a;this.h=b;this.xe=c;this.Xb=d;this.Cb=e;this.Ne=f;this.ac=h;this.Kb=k;this.i=4194305;this.C=4352}g=th.prototype;
g.call=function(){function a(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F,R){a=this;var qa=Wb.s(a.h,b,c,d,e,wd([f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F,R],0)),gi=Z(this,qa);A(gi)||W(a.name,qa);return Wb.s(gi,b,c,d,e,wd([f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F,R],0))}function b(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F){a=this;var R=a.h.oa?a.h.oa(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F),qa=Z(this,R);A(qa)||W(a.name,R);return qa.oa?qa.oa(b,c,d,e,f,h,k,l,m,n,p,q,r,
t,v,w,z,x,D,F):qa.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D,F)}function c(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D){a=this;var F=a.h.na?a.h.na(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D),R=Z(this,F);A(R)||W(a.name,F);return R.na?R.na(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D):R.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x,D)}function d(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x){a=this;var D=a.h.ma?a.h.ma(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x):a.h.call(null,
b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x),F=Z(this,D);A(F)||W(a.name,D);return F.ma?F.ma(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x):F.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z,x)}function e(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z){a=this;var x=a.h.la?a.h.la(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z),D=Z(this,x);A(D)||W(a.name,x);return D.la?D.la(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z):D.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w,z)}function f(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,
w){a=this;var z=a.h.ka?a.h.ka(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w),x=Z(this,z);A(x)||W(a.name,z);return x.ka?x.ka(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w):x.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v,w)}function h(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v){a=this;var w=a.h.ja?a.h.ja(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v),z=Z(this,w);A(z)||W(a.name,w);return z.ja?z.ja(b,c,d,e,f,h,k,l,m,n,p,q,r,t,v):z.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t,v)}
function k(a,b,c,d,e,f,h,k,l,m,n,p,q,r,t){a=this;var v=a.h.ia?a.h.ia(b,c,d,e,f,h,k,l,m,n,p,q,r,t):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t),w=Z(this,v);A(w)||W(a.name,v);return w.ia?w.ia(b,c,d,e,f,h,k,l,m,n,p,q,r,t):w.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r,t)}function l(a,b,c,d,e,f,h,k,l,m,n,p,q,r){a=this;var t=a.h.ha?a.h.ha(b,c,d,e,f,h,k,l,m,n,p,q,r):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q,r),v=Z(this,t);A(v)||W(a.name,t);return v.ha?v.ha(b,c,d,e,f,h,k,l,m,n,p,q,r):v.call(null,b,c,d,e,f,h,k,l,m,n,p,
q,r)}function n(a,b,c,d,e,f,h,k,l,m,n,p,q){a=this;var r=a.h.ga?a.h.ga(b,c,d,e,f,h,k,l,m,n,p,q):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p,q),t=Z(this,r);A(t)||W(a.name,r);return t.ga?t.ga(b,c,d,e,f,h,k,l,m,n,p,q):t.call(null,b,c,d,e,f,h,k,l,m,n,p,q)}function m(a,b,c,d,e,f,h,k,l,m,n,p){a=this;var q=a.h.fa?a.h.fa(b,c,d,e,f,h,k,l,m,n,p):a.h.call(null,b,c,d,e,f,h,k,l,m,n,p),r=Z(this,q);A(r)||W(a.name,q);return r.fa?r.fa(b,c,d,e,f,h,k,l,m,n,p):r.call(null,b,c,d,e,f,h,k,l,m,n,p)}function p(a,b,c,d,e,f,h,k,l,m,
n){a=this;var p=a.h.ea?a.h.ea(b,c,d,e,f,h,k,l,m,n):a.h.call(null,b,c,d,e,f,h,k,l,m,n),q=Z(this,p);A(q)||W(a.name,p);return q.ea?q.ea(b,c,d,e,f,h,k,l,m,n):q.call(null,b,c,d,e,f,h,k,l,m,n)}function q(a,b,c,d,e,f,h,k,l,m){a=this;var n=a.h.qa?a.h.qa(b,c,d,e,f,h,k,l,m):a.h.call(null,b,c,d,e,f,h,k,l,m),p=Z(this,n);A(p)||W(a.name,n);return p.qa?p.qa(b,c,d,e,f,h,k,l,m):p.call(null,b,c,d,e,f,h,k,l,m)}function r(a,b,c,d,e,f,h,k,l){a=this;var m=a.h.pa?a.h.pa(b,c,d,e,f,h,k,l):a.h.call(null,b,c,d,e,f,h,k,l),n=
Z(this,m);A(n)||W(a.name,m);return n.pa?n.pa(b,c,d,e,f,h,k,l):n.call(null,b,c,d,e,f,h,k,l)}function t(a,b,c,d,e,f,h,k){a=this;var l=a.h.W?a.h.W(b,c,d,e,f,h,k):a.h.call(null,b,c,d,e,f,h,k),m=Z(this,l);A(m)||W(a.name,l);return m.W?m.W(b,c,d,e,f,h,k):m.call(null,b,c,d,e,f,h,k)}function v(a,b,c,d,e,f,h){a=this;var k=a.h.J?a.h.J(b,c,d,e,f,h):a.h.call(null,b,c,d,e,f,h),l=Z(this,k);A(l)||W(a.name,k);return l.J?l.J(b,c,d,e,f,h):l.call(null,b,c,d,e,f,h)}function w(a,b,c,d,e,f){a=this;var h=a.h.w?a.h.w(b,c,
d,e,f):a.h.call(null,b,c,d,e,f),k=Z(this,h);A(k)||W(a.name,h);return k.w?k.w(b,c,d,e,f):k.call(null,b,c,d,e,f)}function z(a,b,c,d,e){a=this;var f=a.h.o?a.h.o(b,c,d,e):a.h.call(null,b,c,d,e),h=Z(this,f);A(h)||W(a.name,f);return h.o?h.o(b,c,d,e):h.call(null,b,c,d,e)}function D(a,b,c,d){a=this;var e=a.h.c?a.h.c(b,c,d):a.h.call(null,b,c,d),f=Z(this,e);A(f)||W(a.name,e);return f.c?f.c(b,c,d):f.call(null,b,c,d)}function F(a,b,c){a=this;var d=a.h.b?a.h.b(b,c):a.h.call(null,b,c),e=Z(this,d);A(e)||W(a.name,
d);return e.b?e.b(b,c):e.call(null,b,c)}function R(a,b){a=this;var c=a.h.a?a.h.a(b):a.h.call(null,b),d=Z(this,c);A(d)||W(a.name,c);return d.a?d.a(b):d.call(null,b)}function qa(a){a=this;var b=a.h.B?a.h.B():a.h.call(null),c=Z(this,b);A(c)||W(a.name,b);return c.B?c.B():c.call(null)}var x=null,x=function(x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob,Hb,cc,Hc,Cd,Qf){switch(arguments.length){case 1:return qa.call(this,x);case 2:return R.call(this,x,Q);case 3:return F.call(this,x,Q,T);case 4:return D.call(this,
x,Q,T,X);case 5:return z.call(this,x,Q,T,X,Y);case 6:return w.call(this,x,Q,T,X,Y,ca);case 7:return v.call(this,x,Q,T,X,Y,ca,ga);case 8:return t.call(this,x,Q,T,X,Y,ca,ga,ja);case 9:return r.call(this,x,Q,T,X,Y,ca,ga,ja,la);case 10:return q.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa);case 11:return p.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua);case 12:return m.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya);case 13:return n.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia);case 14:return l.call(this,x,Q,T,X,Y,ca,ga,ja,la,
pa,ua,ya,Ia,bc);case 15:return k.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra);case 16:return h.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb);case 17:return f.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob);case 18:return e.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob,Hb);case 19:return d.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob,Hb,cc);case 20:return c.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob,Hb,cc,Hc);case 21:return b.call(this,x,Q,T,
X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob,Hb,cc,Hc,Cd);case 22:return a.call(this,x,Q,T,X,Y,ca,ga,ja,la,pa,ua,ya,Ia,bc,Ra,cb,ob,Hb,cc,Hc,Cd,Qf)}throw Error("Invalid arity: "+arguments.length);};x.a=qa;x.b=R;x.c=F;x.o=D;x.w=z;x.J=w;x.W=v;x.pa=t;x.qa=r;x.ea=q;x.fa=p;x.ga=m;x.ha=n;x.ia=l;x.ja=k;x.ka=h;x.la=f;x.ma=e;x.na=d;x.oa=c;x.Sc=b;x.Nb=a;return x}();g.apply=function(a,b){return this.call.apply(this,[this].concat(Vb(b)))};
g.B=function(){var a=this.h.B?this.h.B():this.h.call(null),b=Z(this,a);A(b)||W(this.name,a);return b.B?b.B():b.call(null)};g.a=function(a){var b=this.h.a?this.h.a(a):this.h.call(null,a),c=Z(this,b);A(c)||W(this.name,b);return c.a?c.a(a):c.call(null,a)};g.b=function(a,b){var c=this.h.b?this.h.b(a,b):this.h.call(null,a,b),d=Z(this,c);A(d)||W(this.name,c);return d.b?d.b(a,b):d.call(null,a,b)};
g.c=function(a,b,c){var d=this.h.c?this.h.c(a,b,c):this.h.call(null,a,b,c),e=Z(this,d);A(e)||W(this.name,d);return e.c?e.c(a,b,c):e.call(null,a,b,c)};g.o=function(a,b,c,d){var e=this.h.o?this.h.o(a,b,c,d):this.h.call(null,a,b,c,d),f=Z(this,e);A(f)||W(this.name,e);return f.o?f.o(a,b,c,d):f.call(null,a,b,c,d)};g.w=function(a,b,c,d,e){var f=this.h.w?this.h.w(a,b,c,d,e):this.h.call(null,a,b,c,d,e),h=Z(this,f);A(h)||W(this.name,f);return h.w?h.w(a,b,c,d,e):h.call(null,a,b,c,d,e)};
g.J=function(a,b,c,d,e,f){var h=this.h.J?this.h.J(a,b,c,d,e,f):this.h.call(null,a,b,c,d,e,f),k=Z(this,h);A(k)||W(this.name,h);return k.J?k.J(a,b,c,d,e,f):k.call(null,a,b,c,d,e,f)};g.W=function(a,b,c,d,e,f,h){var k=this.h.W?this.h.W(a,b,c,d,e,f,h):this.h.call(null,a,b,c,d,e,f,h),l=Z(this,k);A(l)||W(this.name,k);return l.W?l.W(a,b,c,d,e,f,h):l.call(null,a,b,c,d,e,f,h)};
g.pa=function(a,b,c,d,e,f,h,k){var l=this.h.pa?this.h.pa(a,b,c,d,e,f,h,k):this.h.call(null,a,b,c,d,e,f,h,k),n=Z(this,l);A(n)||W(this.name,l);return n.pa?n.pa(a,b,c,d,e,f,h,k):n.call(null,a,b,c,d,e,f,h,k)};g.qa=function(a,b,c,d,e,f,h,k,l){var n=this.h.qa?this.h.qa(a,b,c,d,e,f,h,k,l):this.h.call(null,a,b,c,d,e,f,h,k,l),m=Z(this,n);A(m)||W(this.name,n);return m.qa?m.qa(a,b,c,d,e,f,h,k,l):m.call(null,a,b,c,d,e,f,h,k,l)};
g.ea=function(a,b,c,d,e,f,h,k,l,n){var m=this.h.ea?this.h.ea(a,b,c,d,e,f,h,k,l,n):this.h.call(null,a,b,c,d,e,f,h,k,l,n),p=Z(this,m);A(p)||W(this.name,m);return p.ea?p.ea(a,b,c,d,e,f,h,k,l,n):p.call(null,a,b,c,d,e,f,h,k,l,n)};g.fa=function(a,b,c,d,e,f,h,k,l,n,m){var p=this.h.fa?this.h.fa(a,b,c,d,e,f,h,k,l,n,m):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m),q=Z(this,p);A(q)||W(this.name,p);return q.fa?q.fa(a,b,c,d,e,f,h,k,l,n,m):q.call(null,a,b,c,d,e,f,h,k,l,n,m)};
g.ga=function(a,b,c,d,e,f,h,k,l,n,m,p){var q=this.h.ga?this.h.ga(a,b,c,d,e,f,h,k,l,n,m,p):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p),r=Z(this,q);A(r)||W(this.name,q);return r.ga?r.ga(a,b,c,d,e,f,h,k,l,n,m,p):r.call(null,a,b,c,d,e,f,h,k,l,n,m,p)};g.ha=function(a,b,c,d,e,f,h,k,l,n,m,p,q){var r=this.h.ha?this.h.ha(a,b,c,d,e,f,h,k,l,n,m,p,q):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q),t=Z(this,r);A(t)||W(this.name,r);return t.ha?t.ha(a,b,c,d,e,f,h,k,l,n,m,p,q):t.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q)};
g.ia=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r){var t=this.h.ia?this.h.ia(a,b,c,d,e,f,h,k,l,n,m,p,q,r):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r),v=Z(this,t);A(v)||W(this.name,t);return v.ia?v.ia(a,b,c,d,e,f,h,k,l,n,m,p,q,r):v.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r)};
g.ja=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t){var v=this.h.ja?this.h.ja(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t),w=Z(this,v);A(w)||W(this.name,v);return w.ja?w.ja(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t):w.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t)};
g.ka=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v){var w=this.h.ka?this.h.ka(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v),z=Z(this,w);A(z)||W(this.name,w);return z.ka?z.ka(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v):z.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v)};
g.la=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w){var z=this.h.la?this.h.la(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w),D=Z(this,z);A(D)||W(this.name,z);return D.la?D.la(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w):D.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w)};
g.ma=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z){var D=this.h.ma?this.h.ma(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z),F=Z(this,D);A(F)||W(this.name,D);return F.ma?F.ma(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z):F.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z)};
g.na=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D){var F=this.h.na?this.h.na(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D),R=Z(this,F);A(R)||W(this.name,F);return R.na?R.na(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D):R.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D)};
g.oa=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F){var R=this.h.oa?this.h.oa(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F):this.h.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F),qa=Z(this,R);A(qa)||W(this.name,R);return qa.oa?qa.oa(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F):qa.call(null,a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F)};
g.Sc=function(a,b,c,d,e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R){var qa=Wb.s(this.h,a,b,c,d,wd([e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R],0)),x=Z(this,qa);A(x)||W(this.name,qa);return Wb.s(x,a,b,c,d,wd([e,f,h,k,l,n,m,p,q,r,t,v,w,z,D,F,R],0))};function uh(a,b){var c=vh;tf.o(c.Cb,ge,a,b);ph(c.ac,c.Cb,c.Kb,c.Xb)}
function Z(a,b){md.b(M.a?M.a(a.Kb):M.call(null,a.Kb),M.a?M.a(a.Xb):M.call(null,a.Xb))||ph(a.ac,a.Cb,a.Kb,a.Xb);var c=(M.a?M.a(a.ac):M.call(null,a.ac)).call(null,b);if(A(c))return c;c=sh(a.name,b,a.Xb,a.Cb,a.Ne,a.ac,a.Kb);return A(c)?c:(M.a?M.a(a.Cb):M.call(null,a.Cb)).call(null,a.xe)}g.Qb=function(){return Zc(this.name)};g.Rb=function(){return $c(this.name)};g.P=function(){return ka(this)};var wh=new B(null,"date","date",-1463434462),xh=new B(null,"remove","remove",-131428414),Lb=new B(null,"meta","meta",1499536964),Mb=new B(null,"dup","dup",556298533),sf=new ld(null,"new-value","new-value",-1567397401,null),of=new B(null,"validator","validator",-1966190681),yh=new B(null,"default","default",-1987822328),zh=new B(null,"name","name",1843675177),Ah=new B(null,"value","value",305978217),Bh=new B(null,"coll","coll",1647737163),Yg=new B(null,"val","val",128701612),Ch=new B(null,"type","type",
1174270348),rf=new ld(null,"validate","validate",1439230700,null),Xg=new B(null,"fallback-impl","fallback-impl",-1501286995),Jb=new B(null,"flush-on-newline","flush-on-newline",-151457939),Dh=new B(null,"print","print",1299562414),lh=new B(null,"descendants","descendants",1824886031),Eh=new B(null,"title","title",636505583),mh=new B(null,"ancestors","ancestors",-776045424),Fh=new B(null,"style","style",-496642736),Gh=new B(null,"div","div",1057191632),Kb=new B(null,"readably","readably",1129599760),
Pg=new B(null,"more-marker","more-marker",-14717935),Nb=new B(null,"print-length","print-length",1931866356),Hh=new B(null,"id","id",-1388402092),Ih=new B(null,"class","class",-2030961996),Jh=new B(null,"checked","checked",-50955819),kh=new B(null,"parents","parents",-2027538891),Kh=new B(null,"input","input",556931961),Lh=new B(null,"xhtml","xhtml",1912943770),ff=new ld(null,"quote","quote",1377916282,null),ef=new B(null,"arglists","arglists",1661989754),df=new ld(null,"nil-iter","nil-iter",1101030523,
null),Mh=new B(null,"add","add",235287739),Nh=new B(null,"hierarchy","hierarchy",-1053470341),Wg=new B(null,"alt-impl","alt-impl",670969595),hh=new B(null,"keywordize-keys","keywordize-keys",1310784252),Oh=new B(null,"text","text",-1790561697),Ph=new B(null,"attr","attr",-604132353);function Qh(a){var b=/\./;if("string"===typeof b)return a.replace(new RegExp(Ba(b),"g")," ");if(b instanceof RegExp)return a.replace(new RegExp(b.source,"g")," ");throw[G("Invalid match arg: "),G(b)].join("");};var Rh={};function Sh(a,b){var c=Rh[b];if(!c){var d=Ea(b),c=d;void 0===a.style[d]&&(d=(lb?"Webkit":kb?"Moz":ib?"ms":hb?"O":null)+Fa(d),void 0!==a.style[d]&&(c=d));Rh[b]=c}return c};function Th(){}function Uh(){}var Vh=function Vh(b){if(null!=b&&null!=b.te)return b.te(b);var c=Vh[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=Vh._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("bindable.-value",b);},Wh=function Wh(b,c){if(null!=b&&null!=b.se)return b.se(b,c);var d=Wh[y(null==b?null:b)];if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);d=Wh._;if(null!=d)return d.b?d.b(b,c):d.call(null,b,c);throw E("bindable.-on-change",b);};
function Xh(a){return null!=a?a.Ff?!0:a.xb?!1:C(Uh,a):C(Uh,a)}function Yh(a){return null!=a?a.Gf?!0:a.xb?!1:C(Th,a):C(Th,a)}function Zh(a,b){return Wh(a,b)};var $h=new Ib(null,2,[Lh,"http://www.w3.org/1999/xhtml",new B(null,"svg","svg",856789142),"http://www.w3.org/2000/svg"],null);ai;bi;ci;V.a?V.a(0):V.call(null,0);var di=V.a?V.a(ce):V.call(null,ce);function ei(a,b){tf.c(di,be,new S(null,2,5,U,[a,b],null))}function fi(){}
var hi=function hi(b){if(null!=b&&null!=b.ve)return b.ve(b);var c=hi[y(null==b?null:b)];if(null!=c)return c.a?c.a(b):c.call(null,b);c=hi._;if(null!=c)return c.a?c.a(b):c.call(null,b);throw E("Element.-elem",b);},ii=function ii(b,c){for(var d=J(c),e=null,f=0,h=0;;)if(h<f){var k=e.O(null,h),l;if(null!=k?k.ue||(k.xb?0:C(fi,k)):C(fi,k))l=hi(k);else if(null==k)l=null;else{if(ne(k))throw"Maps cannot be used as content";"string"===typeof k?l=document.createTextNode(String(k)):oe(k)?l=ai.a?ai.a(k):ai.call(null,
k):ve(k)?l=ii(b,k):A(Yh(k))?(ei(Bh,k),l=ii(b,new S(null,1,5,U,[Vh(k)],null))):A(Xh(k))?(ei(Oh,k),l=ii(b,new S(null,1,5,U,[Vh(k)],null))):l=A(k.nodeName)?k:A(k.get)?k.get(0):function(){var b=""+G(k);return document.createTextNode(String(b))}()}A(l)&&b.appendChild(l);h+=1}else if(d=J(d)){if(re(d))f=Wc(d),d=Xc(d),e=f,f=O(f);else{k=K(d);if(null!=k?k.ue||(k.xb?0:C(fi,k)):C(fi,k))e=hi(k);else if(null==k)e=null;else{if(ne(k))throw"Maps cannot be used as content";"string"===typeof k?e=document.createTextNode(String(k)):
oe(k)?e=ai.a?ai.a(k):ai.call(null,k):ve(k)?e=ii(b,k):A(Yh(k))?(ei(Bh,k),e=ii(b,new S(null,1,5,U,[Vh(k)],null))):A(Xh(k))?(ei(Oh,k),e=ii(b,new S(null,1,5,U,[Vh(k)],null))):e=A(k.nodeName)?k:A(k.get)?k.get(0):function(){var b=""+G(k);return document.createTextNode(String(b))}()}A(e)&&b.appendChild(e);d=L(d);e=null;f=0}h=0}else return null};
if("undefined"===typeof vh)var vh=function(){var a=V.a?V.a(gf):V.call(null,gf),b=V.a?V.a(gf):V.call(null,gf),c=V.a?V.a(gf):V.call(null,gf),d=V.a?V.a(gf):V.call(null,gf),e=ud.c(gf,Nh,jh());return new th(vd.b("crate.compiler","dom-binding"),function(){return function(a){return a}}(a,b,c,d,e),yh,e,a,b,c,d)}();uh(Oh,function(a,b,c){return Zh(b,function(a){for(var b;b=c.firstChild;)c.removeChild(b);return ii(c,new S(null,1,5,U,[a],null))})});
uh(Ph,function(a,b,c){a=P(b,0);var d=P(b,1);return Zh(d,function(a,b){return function(a){return bi.c?bi.c(c,b,a):bi.call(null,c,b,a)}}(b,a,d))});uh(Fh,function(a,b,c){a=P(b,0);var d=P(b,1);return Zh(d,function(a,b){return function(a){return A(b)?ci.c?ci.c(c,b,a):ci.call(null,c,b,a):ci.b?ci.b(c,a):ci.call(null,c,a)}}(b,a,d))});
uh(Bh,function(a,b,c){return Zh(b,function(a,e,f){if(A(md.b?md.b(Mh,a):md.call(null,Mh,a)))return a=b.Ke.call(null,Mh),A(a)?e=a.c?a.c(c,e,f):a.call(null,c,e,f):(c.appendChild(e),e=void 0),e;if(A(md.b?md.b(xh,a):md.call(null,xh,a)))return f=b.Ke.call(null,xh),A(f)?f.a?f.a(e):f.call(null,e):xb(e);throw Error([G("No matching clause: "),G(a)].join(""));})});
var ci=function ci(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return ci.b(arguments[0],arguments[1]);case 3:return ci.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
ci.b=function(a,b){if("string"===typeof b)a.setAttribute("style",b);else if(ne(b))for(var c=J(b),d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);ci.c(a,k,h);f+=1}else if(c=J(c))re(c)?(e=Wc(c),c=Xc(c),d=e,e=O(e)):(e=K(c),d=P(e,0),e=P(e,1),ci.c(a,d,e),c=L(c),d=null,e=0),f=0;else break;else A(Xh(b))&&(ei(Fh,new S(null,2,5,U,[null,b],null)),ci.b(a,Vh(b)));return a};
ci.c=function(a,b,c){A(Xh(c))&&(ei(Fh,new S(null,2,5,U,[b,c],null)),c=Vh(c));b=Ie(b);if(fa(b)){var d=Sh(a,b);d&&(a.style[d]=c)}else for(d in b){c=a;var e=b[d],f=Sh(c,d);f&&(c.style[f]=e)}};ci.A=3;var bi=function bi(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return bi.b(arguments[0],arguments[1]);case 3:return bi.c(arguments[0],arguments[1],arguments[2]);default:throw Error([G("Invalid arity: "),G(c.length)].join(""));}};
bi.b=function(a,b){if(A(a)){if(ne(b)){for(var c=J(b),d=null,e=0,f=0;;)if(f<e){var h=d.O(null,f),k=P(h,0),h=P(h,1);bi.c(a,k,h);f+=1}else if(c=J(c))re(c)?(e=Wc(c),c=Xc(c),d=e,e=O(e)):(e=K(c),d=P(e,0),e=P(e,1),bi.c(a,d,e),c=L(c),d=null,e=0),f=0;else break;return a}return a.getAttribute(Ie(b))}return null};bi.c=function(a,b,c){md.b(b,Fh)?ci.b(a,c):(A(Xh(c))&&(ei(Ph,new S(null,2,5,U,[b,c],null)),c=Vh(c)),a.setAttribute(Ie(b),c));return a};bi.A=3;var ji=/([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?/;
function ki(a){return xf.b(gf,He.b(function(a){var c=P(a,0);a=P(a,1);return!0===a?new S(null,2,5,U,[c,Ie(c)],null):new S(null,2,5,U,[c,a],null)},wf(lf.b(we,ae),a)))}
function li(a){var b=P(a,0),c=Ge(a);if(!(b instanceof B||b instanceof ld||"string"===typeof b))throw[G(b),G(" is not a valid tag name.")].join("");var d=Og(ji,Ie(b)),e=P(d,0),f=P(d,1),h=P(d,2),k=P(d,3),l=function(){var a,b=/:/;a:for(b="/(?:)/"===""+G(b)?be.b(Ae(N("",He.b(G,J(f)))),""):Ae((""+G(f)).split(b));;)if(""===(null==b?null:sc(b)))b=null==b?null:tc(b);else break a;a=b;b=P(a,0);a=P(a,1);var c;c=Re.a(b);c=$h.a?$h.a(c):$h.call(null,c);return A(a)?new S(null,2,5,U,[A(c)?c:b,a],null):new S(null,
2,5,U,[Lh.a($h),b],null)}(),n=P(l,0),m=P(l,1);a=xf.b(gf,wf(function(){return function(a){return null!=ae(a)}}(d,e,f,h,k,l,n,m,a,b,c),new Ib(null,2,[Hh,A(h)?h:null,Ih,A(k)?Qh(k):null],null)));b=K(c);return ne(b)?new S(null,4,5,U,[n,m,Ig(wd([a,ki(b)],0)),L(c)],null):new S(null,4,5,U,[n,m,a,c],null)}var mi=A(document.createElementNS)?function(a,b){return document.createElementNS(a,b)}:function(a,b){return document.createElement(b)};
function ai(a){var b=di;di=V.a?V.a(ce):V.call(null,ce);try{var c=li(a),d=P(c,0),e=P(c,1),f=P(c,2),h=P(c,3),k=mi.b?mi.b(d,e):mi.call(null,d,e);bi.b(k,f);ii(k,h);a:{var l=M.a?M.a(di):M.call(null,di),n=J(l);a=null;for(d=c=0;;)if(d<c){var m=a.O(null,d),p=P(m,0),q=P(m,1);vh.c?vh.c(p,q,k):vh.call(null,p,q,k);d+=1}else{var r=J(n);if(r){e=r;if(re(e)){var t=Wc(e),v=Xc(e),e=t,w=O(t),n=v;a=e;c=w}else{var z=K(e),p=P(z,0),q=P(z,1);vh.c?vh.c(p,q,k):vh.call(null,p,q,k);n=L(e);a=null;c=0}d=0}else break a}}return k}finally{di=
b}};V.a?V.a(0):V.call(null,0);function ni(a){a=He.b(ai,a);return A(ae(a))?a:K(a)};!Xa("Android")||gb()||Xa("Firefox")||fb();gb();function oi(a){if("function"==typeof a.qc)return a.qc();if(fa(a))return a.split("");if(ea(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return $a(a)}
function pi(a,b){if("function"==typeof a.forEach)a.forEach(b,void 0);else if(ea(a)||fa(a))La(a,b,void 0);else{var c;if("function"==typeof a.Wb)c=a.Wb();else if("function"!=typeof a.qc)if(ea(a)||fa(a)){c=[];for(var d=a.length,e=0;e<d;e++)c.push(e)}else c=ab(a);else c=void 0;for(var d=oi(a),e=d.length,f=0;f<e;f++)b.call(void 0,d[f],c&&c[f],a)}};function qi(a,b){this.Ua={};this.wa=[];this.Ta=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)}g=qi.prototype;g.qc=function(){ri(this);for(var a=[],b=0;b<this.wa.length;b++)a.push(this.Ua[this.wa[b]]);return a};g.Wb=function(){ri(this);return this.wa.concat()};
g.equals=function(a,b){if(this===a)return!0;if(this.Ta!=a.Ta)return!1;var c=b||si;ri(this);for(var d,e=0;d=this.wa[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};function si(a,b){return a===b}g.isEmpty=function(){return 0==this.Ta};g.clear=function(){this.Ua={};this.Ta=this.wa.length=0};g.remove=function(a){return Object.prototype.hasOwnProperty.call(this.Ua,a)?(delete this.Ua[a],this.Ta--,this.wa.length>2*this.Ta&&ri(this),!0):!1};
function ri(a){if(a.Ta!=a.wa.length){for(var b=0,c=0;b<a.wa.length;){var d=a.wa[b];Object.prototype.hasOwnProperty.call(a.Ua,d)&&(a.wa[c++]=d);b++}a.wa.length=c}if(a.Ta!=a.wa.length){for(var e={},c=b=0;b<a.wa.length;)d=a.wa[b],Object.prototype.hasOwnProperty.call(e,d)||(a.wa[c++]=d,e[d]=1),b++;a.wa.length=c}}g.get=function(a,b){return Object.prototype.hasOwnProperty.call(this.Ua,a)?this.Ua[a]:b};
g.set=function(a,b){Object.prototype.hasOwnProperty.call(this.Ua,a)||(this.Ta++,this.wa.push(a));this.Ua[a]=b};g.addAll=function(a){var b;a instanceof qi?(b=a.Wb(),a=a.qc()):(b=ab(a),a=$a(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};g.forEach=function(a,b){for(var c=this.Wb(),d=0;d<c.length;d++){var e=c[d],f=this.get(e);a.call(b,f,e,this)}};g.clone=function(){return new qi(this)};function ti(a,b,c,d,e){this.reset(a,b,c,d,e)}ti.prototype.Ad=null;var ui=0;ti.prototype.reset=function(a,b,c,d,e){"number"==typeof e||ui++;d||ta();this.$b=a;this.He=b;delete this.Ad};ti.prototype.Sd=function(a){this.$b=a};function vi(a){this.Id=a;this.Cd=this.Nc=this.$b=this.ra=null}function wi(a,b){this.name=a;this.value=b}wi.prototype.toString=function(){return this.name};var xi=new wi("SEVERE",1E3),yi=new wi("WARNING",900),zi=new wi("INFO",800),Ai=new wi("CONFIG",700),Bi=new wi("FINE",500),Ci=new wi("FINEST",300);g=vi.prototype;g.getName=function(){return this.Id};g.getParent=function(){return this.ra};g.Bd=function(){this.Nc||(this.Nc={});return this.Nc};g.Sd=function(a){this.$b=a};
function Di(a){if(a.$b)return a.$b;if(a.ra)return Di(a.ra);Ha("Root logger has no level set.");return null}g.log=function(a,b,c){if(a.value>=Di(this).value)for(ha(b)&&(b=b()),a=new ti(a,String(b),this.Id),c&&(a.Ad=c),c="log:"+a.He,u.console&&(u.console.timeStamp?u.console.timeStamp(c):u.console.markTimeline&&u.console.markTimeline(c)),u.msWriteProfilerMark&&u.msWriteProfilerMark(c),c=this;c;){b=c;var d=a;if(b.Cd)for(var e=0,f=void 0;f=b.Cd[e];e++)f(d);c=c.getParent()}};
g.info=function(a,b){this.log(zi,a,b)};var Ei={},Fi=null;function Gi(a){Fi||(Fi=new vi(""),Ei[""]=Fi,Fi.Sd(Ai));var b;if(!(b=Ei[a])){b=new vi(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=Gi(a.substr(0,c));c.Bd()[d]=b;b.ra=c;Ei[a]=b}return b};function Hi(a){var b=Ii;b&&b.log(Ci,a,void 0)}function Ji(a){var b=Ii;b&&b.log(yi,a,void 0)}function Ki(a,b){a&&a.log(Bi,b,void 0)};var Li={1:"NativeMessagingTransport",2:"FrameElementMethodTransport",3:"IframeRelayTransport",4:"IframePollingTransport",5:"FlashTransport",6:"NixTransport",7:"DirectTransport"},Mi={df:"cn",cf:"at",sf:"rat",of:"pu",gf:"ifrid",vf:"tp",jf:"lru",nf:"pru",Vd:"lpu",Wd:"ppu",mf:"ph",lf:"osh",tf:"role",kf:"nativeProtocolVersion",ff:"directSyncMode"},Ii=Gi("goog.net.xpc");function Ni(a){a.prototype.then=a.prototype.then;a.prototype.$goog_Thenable=!0}function Oi(a){if(!a)return!1;try{return!!a.$goog_Thenable}catch(b){return!1}};function Pi(a,b,c){this.Fe=c;this.we=a;this.Re=b;this.yc=0;this.tc=null}Pi.prototype.get=function(){var a;0<this.yc?(this.yc--,a=this.tc,this.tc=a.next,a.next=null):a=this.we();return a};Pi.prototype.put=function(a){this.Re(a);this.yc<this.Fe&&(this.yc++,a.next=this.tc,this.tc=a)};function Qi(){this.Fc=this.Jb=null}var Si=new Pi(function(){return new Ri},function(a){a.reset()},100);Qi.prototype.add=function(a,b){var c=Si.get();c.set(a,b);this.Fc?this.Fc.next=c:this.Jb=c;this.Fc=c};Qi.prototype.remove=function(){var a=null;this.Jb&&(a=this.Jb,this.Jb=this.Jb.next,this.Jb||(this.Fc=null),a.next=null);return a};function Ri(){this.next=this.scope=this.Na=null}Ri.prototype.set=function(a,b){this.Na=a;this.scope=b;this.next=null};
Ri.prototype.reset=function(){this.next=this.scope=this.Na=null};function Ti(a){u.setTimeout(function(){throw a;},0)}var Ui;
function Vi(){var a=u.MessageChannel;"undefined"===typeof a&&"undefined"!==typeof window&&window.postMessage&&window.addEventListener&&!Xa("Presto")&&(a=function(){var a=document.createElement("IFRAME");a.style.display="none";a.src="";document.documentElement.appendChild(a);var b=a.contentWindow,a=b.document;a.open();a.write("");a.close();var c="callImmediate"+Math.random(),d="file:"==b.location.protocol?"*":b.location.protocol+"//"+b.location.host,a=sa(function(a){if(("*"==d||a.origin==d)&&a.data==
c)this.port1.onmessage()},this);b.addEventListener("message",a,!1);this.port1={};this.port2={postMessage:function(){b.postMessage(c,d)}}});if("undefined"!==typeof a&&!Xa("Trident")&&!Xa("MSIE")){var b=new a,c={},d=c;b.port1.onmessage=function(){if(ba(c.next)){c=c.next;var a=c.jd;c.jd=null;a()}};return function(a){d.next={jd:a};d=d.next;b.port2.postMessage(0)}}return"undefined"!==typeof document&&"onreadystatechange"in document.createElement("SCRIPT")?function(a){var b=document.createElement("SCRIPT");
b.onreadystatechange=function(){b.onreadystatechange=null;b.parentNode.removeChild(b);b=null;a();a=null};document.documentElement.appendChild(b)}:function(a){u.setTimeout(a,0)}};function Wi(a,b){Xi||Yi();Zi||(Xi(),Zi=!0);$i.add(a,b)}var Xi;function Yi(){if(u.Promise&&u.Promise.resolve){var a=u.Promise.resolve(void 0);Xi=function(){a.then(aj)}}else Xi=function(){var a=aj;!ha(u.setImmediate)||u.Window&&u.Window.prototype&&u.Window.prototype.setImmediate==u.setImmediate?(Ui||(Ui=Vi()),Ui(a)):u.setImmediate(a)}}var Zi=!1,$i=new Qi;[].push(function(){Zi=!1;$i=new Qi});function aj(){for(var a=null;a=$i.remove();){try{a.Na.call(a.scope)}catch(b){Ti(b)}Si.put(a)}Zi=!1};function bj(a,b){this.Ma=cj;this.Qa=void 0;this.ub=this.Za=this.ra=null;this.rc=this.Wc=!1;if(a!=da)try{var c=this;a.call(b,function(a){dj(c,ej,a)},function(a){if(!(a instanceof fj))try{if(a instanceof Error)throw a;throw Error("Promise rejected.");}catch(b){}dj(c,gj,a)})}catch(d){dj(this,gj,d)}}var cj=0,ej=2,gj=3;function hj(){this.next=this.context=this.Eb=this.cc=this.eb=null;this.hc=!1}hj.prototype.reset=function(){this.context=this.Eb=this.cc=this.eb=null;this.hc=!1};
var ij=new Pi(function(){return new hj},function(a){a.reset()},100);function jj(a,b,c){var d=ij.get();d.cc=a;d.Eb=b;d.context=c;return d}bj.prototype.then=function(a,b,c){return kj(this,ha(a)?a:null,ha(b)?b:null,c)};Ni(bj);bj.prototype.cancel=function(a){this.Ma==cj&&Wi(function(){var b=new fj(a);lj(this,b)},this)};
function lj(a,b){if(a.Ma==cj)if(a.ra){var c=a.ra;if(c.Za){for(var d=0,e=null,f=null,h=c.Za;h&&(h.hc||(d++,h.eb==a&&(e=h),!(e&&1<d)));h=h.next)e||(f=h);e&&(c.Ma==cj&&1==d?lj(c,b):(f?(d=f,d.next==c.ub&&(c.ub=d),d.next=d.next.next):mj(c),nj(c,e,gj,b)))}a.ra=null}else dj(a,gj,b)}function oj(a,b){a.Za||a.Ma!=ej&&a.Ma!=gj||pj(a);a.ub?a.ub.next=b:a.Za=b;a.ub=b}
function kj(a,b,c,d){var e=jj(null,null,null);e.eb=new bj(function(a,h){e.cc=b?function(c){try{var e=b.call(d,c);a(e)}catch(n){h(n)}}:a;e.Eb=c?function(b){try{var e=c.call(d,b);!ba(e)&&b instanceof fj?h(b):a(e)}catch(n){h(n)}}:h});e.eb.ra=a;oj(a,e);return e.eb}bj.prototype.Xe=function(a){this.Ma=cj;dj(this,ej,a)};bj.prototype.Ye=function(a){this.Ma=cj;dj(this,gj,a)};
function dj(a,b,c){if(a.Ma==cj){a==c&&(b=gj,c=new TypeError("Promise cannot resolve to itself"));a.Ma=1;var d;a:{var e=c,f=a.Xe,h=a.Ye;if(e instanceof bj)oj(e,jj(f||da,h||null,a)),d=!0;else if(Oi(e))e.then(f,h,a),d=!0;else{if(ia(e))try{var k=e.then;if(ha(k)){qj(e,k,f,h,a);d=!0;break a}}catch(l){h.call(a,l);d=!0;break a}d=!1}}d||(a.Qa=c,a.Ma=b,a.ra=null,pj(a),b!=gj||c instanceof fj||rj(a,c))}}
function qj(a,b,c,d,e){function f(a){k||(k=!0,d.call(e,a))}function h(a){k||(k=!0,c.call(e,a))}var k=!1;try{b.call(a,h,f)}catch(l){f(l)}}function pj(a){a.Wc||(a.Wc=!0,Wi(a.Be,a))}function mj(a){var b=null;a.Za&&(b=a.Za,a.Za=b.next,b.next=null);a.Za||(a.ub=null);return b}bj.prototype.Be=function(){for(var a=null;a=mj(this);)nj(this,a,this.Ma,this.Qa);this.Wc=!1};
function nj(a,b,c,d){if(c==gj&&b.Eb&&!b.hc)for(;a&&a.rc;a=a.ra)a.rc=!1;if(b.eb)b.eb.ra=null,sj(b,c,d);else try{b.hc?b.cc.call(b.context):sj(b,c,d)}catch(e){tj.call(null,e)}ij.put(b)}function sj(a,b,c){b==ej?a.cc.call(a.context,c):a.Eb&&a.Eb.call(a.context,c)}function rj(a,b){a.rc=!0;Wi(function(){a.rc&&tj.call(null,b)})}var tj=Ti;function fj(a){wa.call(this,a)}va(fj,wa);fj.prototype.name="cancel";function uj(){0!=vj&&(wj[ka(this)]=this);this.lb=this.lb;this.zc=this.zc}var vj=0,wj={};uj.prototype.lb=!1;uj.prototype.ye=function(){if(!this.lb&&(this.lb=!0,this.kb(),0!=vj)){var a=ka(this);delete wj[a]}};uj.prototype.kb=function(){if(this.zc)for(;this.zc.length;)this.zc.shift()()};var xj=!ib||9<=tb,yj=ib&&!rb("9");!lb||rb("528");kb&&rb("1.9b")||ib&&rb("8")||hb&&rb("9.5")||lb&&rb("528");kb&&!rb("8")||ib&&rb("9");function zj(a,b){this.type=a;this.currentTarget=this.target=b;this.defaultPrevented=this.rb=!1;this.Pd=!0}zj.prototype.stopPropagation=function(){this.rb=!0};zj.prototype.preventDefault=function(){this.defaultPrevented=!0;this.Pd=!1};function Aj(a){Aj[" "](a);return a}Aj[" "]=da;function Bj(a,b){zj.call(this,a?a.type:"");this.relatedTarget=this.currentTarget=this.target=null;this.charCode=this.keyCode=this.button=this.screenY=this.screenX=this.clientY=this.clientX=this.offsetY=this.offsetX=0;this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.Vb=this.state=null;if(a){var c=this.type=a.type;this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;if(d){if(kb){var e;a:{try{Aj(d.nodeName);e=!0;break a}catch(f){}e=!1}e||(d=null)}}else"mouseover"==
c?d=a.fromElement:"mouseout"==c&&(d=a.toElement);this.relatedTarget=d;this.offsetX=lb||void 0!==a.offsetX?a.offsetX:a.layerX;this.offsetY=lb||void 0!==a.offsetY?a.offsetY:a.layerY;this.clientX=void 0!==a.clientX?a.clientX:a.pageX;this.clientY=void 0!==a.clientY?a.clientY:a.pageY;this.screenX=a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;
this.metaKey=a.metaKey;this.state=a.state;this.Vb=a;a.defaultPrevented&&this.preventDefault()}}va(Bj,zj);Bj.prototype.stopPropagation=function(){Bj.dc.stopPropagation.call(this);this.Vb.stopPropagation?this.Vb.stopPropagation():this.Vb.cancelBubble=!0};Bj.prototype.preventDefault=function(){Bj.dc.preventDefault.call(this);var a=this.Vb;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,yj)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};var Cj="closure_listenable_"+(1E6*Math.random()|0),Dj=0;function Ej(a,b,c,d,e){this.listener=a;this.Ac=null;this.src=b;this.type=c;this.Lb=!!d;this.sc=e;this.key=++Dj;this.Fb=this.jc=!1}function Fj(a){a.Fb=!0;a.listener=null;a.Ac=null;a.src=null;a.sc=null};function Gj(a){this.src=a;this.za={};this.ec=0}Gj.prototype.add=function(a,b,c,d,e){var f=a.toString();a=this.za[f];a||(a=this.za[f]=[],this.ec++);var h=Hj(a,b,d,e);-1<h?(b=a[h],c||(b.jc=!1)):(b=new Ej(b,this.src,f,!!d,e),b.jc=c,a.push(b));return b};Gj.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.za))return!1;var e=this.za[a];b=Hj(e,b,c,d);return-1<b?(Fj(e[b]),Ja.splice.call(e,b,1),0==e.length&&(delete this.za[a],this.ec--),!0):!1};
function Ij(a,b){var c=b.type;c in a.za&&Qa(a.za[c],b)&&(Fj(b),0==a.za[c].length&&(delete a.za[c],a.ec--))}Gj.prototype.Xc=function(a,b,c,d){a=this.za[a.toString()];var e=-1;a&&(e=Hj(a,b,c,d));return-1<e?a[e]:null};Gj.prototype.hasListener=function(a,b){var c=ba(a),d=c?a.toString():"",e=ba(b);return Za(this.za,function(a){for(var h=0;h<a.length;++h)if(!(c&&a[h].type!=d||e&&a[h].Lb!=b))return!0;return!1})};
function Hj(a,b,c,d){for(var e=0;e<a.length;++e){var f=a[e];if(!f.Fb&&f.listener==b&&f.Lb==!!c&&f.sc==d)return e}return-1};var Jj="closure_lm_"+(1E6*Math.random()|0),Kj={},Lj=0;
function Mj(a,b,c,d,e){if("array"==y(b))for(var f=0;f<b.length;f++)Mj(a,b[f],c,d,e);else if(c=Nj(c),a&&a[Cj])a.Ha.add(String(b),c,!1,d,e);else{if(!b)throw Error("Invalid event type");var f=!!d,h=Oj(a);h||(a[Jj]=h=new Gj(a));c=h.add(b,c,!1,d,e);if(!c.Ac){d=Pj();c.Ac=d;d.src=a;d.listener=c;if(a.addEventListener)a.addEventListener(b.toString(),d,f);else if(a.attachEvent)a.attachEvent(Qj(b.toString()),d);else throw Error("addEventListener and attachEvent are unavailable.");Lj++}}}
function Pj(){var a=Rj,b=xj?function(c){return a.call(b.src,b.listener,c)}:function(c){c=a.call(b.src,b.listener,c);if(!c)return c};return b}function Sj(a,b,c,d,e){if("array"==y(b))for(var f=0;f<b.length;f++)Sj(a,b[f],c,d,e);else c=Nj(c),a&&a[Cj]?a.Ha.remove(String(b),c,d,e):a&&(a=Oj(a))&&(b=a.Xc(b,c,!!d,e))&&Tj(b)}
function Tj(a){if("number"!=typeof a&&a&&!a.Fb){var b=a.src;if(b&&b[Cj])Ij(b.Ha,a);else{var c=a.type,d=a.Ac;b.removeEventListener?b.removeEventListener(c,d,a.Lb):b.detachEvent&&b.detachEvent(Qj(c),d);Lj--;(c=Oj(b))?(Ij(c,a),0==c.ec&&(c.src=null,b[Jj]=null)):Fj(a)}}}function Qj(a){return a in Kj?Kj[a]:Kj[a]="on"+a}function Uj(a,b,c,d){var e=!0;if(a=Oj(a))if(b=a.za[b.toString()])for(b=b.concat(),a=0;a<b.length;a++){var f=b[a];f&&f.Lb==c&&!f.Fb&&(f=Vj(f,d),e=e&&!1!==f)}return e}
function Vj(a,b){var c=a.listener,d=a.sc||a.src;a.jc&&Tj(a);return c.call(d,b)}
function Rj(a,b){if(a.Fb)return!0;if(!xj){var c;if(!(c=b))a:{c=["window","event"];for(var d=u,e;e=c.shift();)if(null!=d[e])d=d[e];else{c=null;break a}c=d}e=c;c=new Bj(e,this);d=!0;if(!(0>e.keyCode||void 0!=e.returnValue)){a:{var f=!1;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(l){f=!0}if(f||void 0==e.returnValue)e.returnValue=!0}e=[];for(f=c.currentTarget;f;f=f.parentNode)e.push(f);for(var f=a.type,h=e.length-1;!c.rb&&0<=h;h--){c.currentTarget=e[h];var k=Uj(e[h],f,!0,c),d=d&&k}for(h=0;!c.rb&&h<
e.length;h++)c.currentTarget=e[h],k=Uj(e[h],f,!1,c),d=d&&k}return d}return Vj(a,new Bj(b,this))}function Oj(a){a=a[Jj];return a instanceof Gj?a:null}var Wj="__closure_events_fn_"+(1E9*Math.random()>>>0);function Nj(a){if(ha(a))return a;a[Wj]||(a[Wj]=function(b){return a.handleEvent(b)});return a[Wj]};function Xj(){uj.call(this);this.Ha=new Gj(this);this.Xd=this;this.$c=null}va(Xj,uj);Xj.prototype[Cj]=!0;g=Xj.prototype;g.addEventListener=function(a,b,c,d){Mj(this,a,b,c,d)};g.removeEventListener=function(a,b,c,d){Sj(this,a,b,c,d)};
g.dispatchEvent=function(a){var b,c=this.$c;if(c)for(b=[];c;c=c.$c)b.push(c);var c=this.Xd,d=a.type||a;if(fa(a))a=new zj(a,c);else if(a instanceof zj)a.target=a.target||c;else{var e=a;a=new zj(d,c);db(a,e)}var e=!0,f;if(b)for(var h=b.length-1;!a.rb&&0<=h;h--)f=a.currentTarget=b[h],e=Yj(f,d,!0,a)&&e;a.rb||(f=a.currentTarget=c,e=Yj(f,d,!0,a)&&e,a.rb||(e=Yj(f,d,!1,a)&&e));if(b)for(h=0;!a.rb&&h<b.length;h++)f=a.currentTarget=b[h],e=Yj(f,d,!1,a)&&e;return e};
g.kb=function(){Xj.dc.kb.call(this);if(this.Ha){var a=this.Ha,b=0,c;for(c in a.za){for(var d=a.za[c],e=0;e<d.length;e++)++b,Fj(d[e]);delete a.za[c];a.ec--}}this.$c=null};function Yj(a,b,c,d){b=a.Ha.za[String(b)];if(!b)return!0;b=b.concat();for(var e=!0,f=0;f<b.length;++f){var h=b[f];if(h&&!h.Fb&&h.Lb==c){var k=h.listener,l=h.sc||h.src;h.jc&&Ij(a.Ha,h);e=!1!==k.call(l,d)&&e}}return e&&0!=d.Pd}g.Xc=function(a,b,c,d){return this.Ha.Xc(String(a),b,c,d)};
g.hasListener=function(a,b){return this.Ha.hasListener(ba(a)?String(a):void 0,b)};function Zj(a,b,c){if(ha(a))c&&(a=sa(a,c));else if(a&&"function"==typeof a.handleEvent)a=sa(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<b?-1:u.setTimeout(a,b||0)};function ak(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};function bk(){}bk.prototype.hd=null;function ck(a){var b;(b=a.hd)||(b={},dk(a)&&(b[0]=!0,b[1]=!0),b=a.hd=b);return b};var ek;function fk(){}va(fk,bk);function gk(a){return(a=dk(a))?new ActiveXObject(a):new XMLHttpRequest}function dk(a){if(!a.Dd&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.Dd=d}catch(e){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.Dd}ek=new fk;var hk=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function ik(a){if(jk){jk=!1;var b=u.location;if(b){var c=b.href;if(c&&(c=(c=ik(c)[3]||null)?decodeURI(c):c)&&c!=b.hostname)throw jk=!0,Error();}}return a.match(hk)}var jk=lb;function kk(a){Xj.call(this);this.headers=new qi;this.Hc=a||null;this.Xa=!1;this.Gc=this.I=null;this.Zb=this.Fd=this.xc="";this.pb=this.Yc=this.vc=this.Vc=!1;this.Hb=0;this.Cc=null;this.Od=lk;this.Ec=this.$e=!1}va(kk,Xj);var lk="";kk.prototype.Ka=Gi("goog.net.XhrIo");var mk=/^https?$/i,nk=["POST","PUT"],ok=[];g=kk.prototype;g.$d=function(){this.ye();Qa(ok,this)};
g.send=function(a,b,c,d){if(this.I)throw Error("[goog.net.XhrIo] Object is active with another request\x3d"+this.xc+"; newUri\x3d"+a);b=b?b.toUpperCase():"GET";this.xc=a;this.Zb="";this.Fd=b;this.Vc=!1;this.Xa=!0;this.I=this.Hc?gk(this.Hc):gk(ek);this.Gc=this.Hc?ck(this.Hc):ck(ek);this.I.onreadystatechange=sa(this.Kd,this);try{Ki(this.Ka,pk(this,"Opening Xhr")),this.Yc=!0,this.I.open(b,String(a),!0),this.Yc=!1}catch(f){Ki(this.Ka,pk(this,"Error opening Xhr: "+f.message));this.pc(5,f);return}a=c||
"";var e=this.headers.clone();d&&pi(d,function(a,b){e.set(b,a)});d=Oa(e.Wb());c=u.FormData&&a instanceof u.FormData;!(0<=Ka(nk,b))||d||c||e.set("Content-Type","application/x-www-form-urlencoded;charset\x3dutf-8");e.forEach(function(a,b){this.I.setRequestHeader(b,a)},this);this.Od&&(this.I.responseType=this.Od);"withCredentials"in this.I&&(this.I.withCredentials=this.$e);try{qk(this),0<this.Hb&&(this.Ec=rk(this.I),Ki(this.Ka,pk(this,"Will abort after "+this.Hb+"ms if incomplete, xhr2 "+this.Ec)),this.Ec?
(this.I.timeout=this.Hb,this.I.ontimeout=sa(this.Td,this)):this.Cc=Zj(this.Td,this.Hb,this)),Ki(this.Ka,pk(this,"Sending request")),this.vc=!0,this.I.send(a),this.vc=!1}catch(f){Ki(this.Ka,pk(this,"Send error: "+f.message)),this.pc(5,f)}};function rk(a){return ib&&rb(9)&&"number"==typeof a.timeout&&ba(a.ontimeout)}function Pa(a){return"content-type"==a.toLowerCase()}
g.Td=function(){"undefined"!=typeof aa&&this.I&&(this.Zb="Timed out after "+this.Hb+"ms, aborting",Ki(this.Ka,pk(this,this.Zb)),this.dispatchEvent("timeout"),this.abort(8))};g.pc=function(a,b){this.Xa=!1;this.I&&(this.pb=!0,this.I.abort(),this.pb=!1);this.Zb=b;sk(this);tk(this)};function sk(a){a.Vc||(a.Vc=!0,a.dispatchEvent("complete"),a.dispatchEvent("error"))}
g.abort=function(){this.I&&this.Xa&&(Ki(this.Ka,pk(this,"Aborting")),this.Xa=!1,this.pb=!0,this.I.abort(),this.pb=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),tk(this))};g.kb=function(){this.I&&(this.Xa&&(this.Xa=!1,this.pb=!0,this.I.abort(),this.pb=!1),tk(this,!0));kk.dc.kb.call(this)};g.Kd=function(){this.lb||(this.Yc||this.vc||this.pb?uk(this):this.Je())};g.Je=function(){uk(this)};
function uk(a){if(a.Xa&&"undefined"!=typeof aa)if(a.Gc[1]&&4==vk(a)&&2==a.getStatus())Ki(a.Ka,pk(a,"Local request error detected and ignored"));else if(a.vc&&4==vk(a))Zj(a.Kd,0,a);else if(a.dispatchEvent("readystatechange"),4==vk(a)){Ki(a.Ka,pk(a,"Request complete"));a.Xa=!1;try{var b=a.getStatus(),c;a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:c=!0;break a;default:c=!1}var d;if(!(d=c)){var e;if(e=0===b){var f=ik(String(a.xc))[1]||null;if(!f&&u.self&&u.self.location)var h=
u.self.location.protocol,f=h.substr(0,h.length-1);e=!mk.test(f?f.toLowerCase():"")}d=e}if(d)a.dispatchEvent("complete"),a.dispatchEvent("success");else{var k;try{k=2<vk(a)?a.I.statusText:""}catch(l){Ki(a.Ka,"Can not get status: "+l.message),k=""}a.Zb=k+" ["+a.getStatus()+"]";sk(a)}}finally{tk(a)}}}
function tk(a,b){if(a.I){qk(a);var c=a.I,d=a.Gc[0]?da:null;a.I=null;a.Gc=null;b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(e){(c=a.Ka)&&c.log(xi,"Problem encountered resetting onreadystatechange: "+e.message,void 0)}}}function qk(a){a.I&&a.Ec&&(a.I.ontimeout=null);"number"==typeof a.Cc&&(u.clearTimeout(a.Cc),a.Cc=null)}function vk(a){return a.I?a.I.readyState:0}g.getStatus=function(){try{return 2<vk(this)?this.I.status:-1}catch(a){return-1}};
g.getResponseHeader=function(a){return this.I&&4==vk(this)?this.I.getResponseHeader(a):void 0};g.getAllResponseHeaders=function(){return this.I&&4==vk(this)?this.I.getAllResponseHeaders():""};function pk(a,b){return b+" ["+a.Fd+" "+a.xc+" "+a.getStatus()+"]"};/*
 Portions of this code are from MochiKit, received by
 The Closure Authors under the MIT license. All other code is Copyright
 2005-2009 The Closure Authors. All Rights Reserved.
*/
function wk(a,b){this.Va=[];this.Jd=a;this.zd=b||null;this.Ab=this.nb=!1;this.Qa=void 0;this.ed=this.Yd=this.Kc=!1;this.Dc=0;this.ra=null;this.Lc=0}wk.prototype.cancel=function(a){if(this.nb)this.Qa instanceof wk&&this.Qa.cancel();else{if(this.ra){var b=this.ra;delete this.ra;a?b.cancel(a):(b.Lc--,0>=b.Lc&&b.cancel())}this.Jd?this.Jd.call(this.zd,this):this.ed=!0;this.nb||this.Ae()}};wk.prototype.xd=function(a,b){this.Kc=!1;this.nb=!0;this.Qa=b;this.Ab=!a;xk(this)};
wk.prototype.Ae=function(){var a=new yk;if(this.nb){if(!this.ed)throw new zk;this.ed=!1}this.nb=!0;this.Qa=a;this.Ab=!0;xk(this)};function Ak(a,b,c){a.Va.push([b,c,void 0]);a.nb&&xk(a)}wk.prototype.then=function(a,b,c){var d,e,f=new bj(function(a,b){d=a;e=b});Ak(this,d,function(a){a instanceof yk?f.cancel():e(a)});return f.then(a,b,c)};Ni(wk);function Bk(a){return Na(a.Va,function(a){return ha(a[1])})}
function xk(a){if(a.Dc&&a.nb&&Bk(a)){var b=a.Dc,c=Ck[b];c&&(u.clearTimeout(c.uc),delete Ck[b]);a.Dc=0}a.ra&&(a.ra.Lc--,delete a.ra);for(var b=a.Qa,d=c=!1;a.Va.length&&!a.Kc;){var e=a.Va.shift(),f=e[0],h=e[1],e=e[2];if(f=a.Ab?h:f)try{var k=f.call(e||a.zd,b);ba(k)&&(a.Ab=a.Ab&&(k==b||k instanceof Error),a.Qa=b=k);if(Oi(b)||"function"===typeof u.Promise&&b instanceof u.Promise)d=!0,a.Kc=!0}catch(l){b=l,a.Ab=!0,Bk(a)||(c=!0)}}a.Qa=b;d&&(k=sa(a.xd,a,!0),d=sa(a.xd,a,!1),b instanceof wk?(Ak(b,k,d),b.Yd=
!0):b.then(k,d));c&&(b=new Dk(b),Ck[b.uc]=b,a.Dc=b.uc)}function zk(){wa.call(this)}va(zk,wa);zk.prototype.message="Deferred has already fired";zk.prototype.name="AlreadyCalledError";function yk(){wa.call(this)}va(yk,wa);yk.prototype.message="Deferred was canceled";yk.prototype.name="CanceledError";function Dk(a){this.uc=u.setTimeout(sa(this.Ve,this),0);this.pc=a}Dk.prototype.Ve=function(){delete Ck[this.uc];throw this.pc;};var Ck={};function Ek(a){uj.call(this);a||(a=xa||(xa=new yb));this.ze=a}va(Ek,uj);Ek.prototype.fd=0;Ek.prototype.getType=function(){return this.fd};Ek.prototype.ab=function(){return this.ze.ab()};Ek.prototype.getName=function(){return Li[String(this.fd)]||""};function Fk(a,b){Ek.call(this,b);this.$=a;this.cd=this.$.Ce()[Mi.Wd];this.Qe=this.$.Ce()[Mi.Vd];this.Bc=[]}var Gk,Hk;va(Fk,Ek);g=Fk.prototype;g.Me=5;g.fd=4;g.Va=0;g.Ib=!1;g.wc=!1;g.Nd=null;function Ik(a){return"googlexpc_"+a.$.name+"_msg"}function Jk(a){return"googlexpc_"+a.$.name+"_ack"}function Kk(a){try{if(!a.lb&&a.$.Ee())return a.$.Kf().frames||{}}catch(b){Ki(Ii,"error retrieving peer frames")}return{}}function Lk(a,b){return Kk(a)[b]}
g.connect=function(){if(!this.lb&&this.$.Ee()){Ki(Ii,"transport connect called");if(!this.wc){Ki(Ii,"initializing...");var a=Ik(this);this.Db=Mk(this,a);this.Zc=this.ab().frames[a];a=Jk(this);this.tb=Mk(this,a);this.Jc=this.ab().frames[a];this.wc=!0}if(Nk(this,Ik(this))&&Nk(this,Jk(this)))Ki(Ii,"foreign frames present"),this.Gd=new Ok(this,Lk(this,Ik(this)),sa(this.Pe,this)),this.gd=new Ok(this,Lk(this,Jk(this)),sa(this.Oe,this)),this.ld();else{Hi("foreign frames not (yet) present");if(1==this.$.De()){if(!(this.Nd||
0<this.Me--)){Hi("Inner peer reconnect triggered.");for(var b=10,a="";0<b--;)a+="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(62*Math.random()));this.$.Nf(a);Hi("switching channels: "+this.$.name);Pk(this);this.wc=!1;this.Nd=Mk(this,"googlexpc_reconnect_"+this.$.name)}}else if(0==this.$.De()){Hi("outerPeerReconnect called");for(var a=Kk(this),c=a.length,d=0;d<c;d++){try{a[d]&&a[d].name&&(b=a[d].name)}catch(f){}if(b){var e=b.split("_");if(3==e.length&&"googlexpc"==
e[0]&&"reconnect"==e[1]){this.$.name=e[2];Pk(this);this.wc=!1;break}}}}this.ab().setTimeout(sa(this.connect,this),100)}}};function Mk(a,b){Hi("constructing sender frame: "+b);var c;c=document.createElement("IFRAME");var d=c.style;d.position="absolute";d.top="-10px";d.left="10px";d.width="1px";d.height="1px";c.id=c.name=b;c.src=a.cd+"#INITIAL";a.ab().document.body.appendChild(c);return c}
function Pk(a){Hi("deconstructSenderFrames called");a.Db&&(a.Db.parentNode.removeChild(a.Db),a.Db=null,a.Zc=null);a.tb&&(a.tb.parentNode.removeChild(a.tb),a.tb=null,a.Jc=null)}function Nk(a,b){Hi("checking for receive frame: "+b);try{var c=Lk(a,b);if(!c||0!=c.location.href.indexOf(a.Qe))return!1}catch(d){return!1}return!0}
g.ld=function(){var a=Kk(this);a[Jk(this)]&&a[Ik(this)]?(this.Hd=new Qk(this.cd,this.Zc),this.gc=new Qk(this.cd,this.Jc),Ki(Ii,"local frames ready"),this.ab().setTimeout(sa(function(){this.Hd.send("SETUP");this.Ib=!0;Ki(Ii,"SETUP sent")},this),100)):(this.kd||(this.kd=sa(this.ld,this)),this.ab().setTimeout(this.kd,100),Ki(Ii,"local frames not (yet) present"))};
function Rk(a){if(a.dd&&a.Md){if(a.$.Lf(),a.yb){Ki(Ii,"delivering queued messages ("+a.yb.length+")");for(var b=0,c;b<a.yb.length;b++)c=a.yb[b],a.$.af(c.Ue,c.Le);delete a.yb}}else Hi("checking if connected: ack sent:"+a.dd+", ack rcvd: "+a.Md)}
g.Pe=function(a){Hi("msg received: "+a);if("SETUP"==a)this.gc&&(this.gc.send("SETUP_ACK"),Hi("SETUP_ACK sent"),this.dd=!0,Rk(this));else if(this.$.Ed()||this.dd){var b=a.indexOf("|"),c=a.substring(0,b);a=a.substring(b+1);b=c.indexOf(",");if(-1==b){var d;this.gc.send("ACK:"+c);Sk(this,a)}else d=c.substring(0,b),this.gc.send("ACK:"+d),c=c.substring(b+1).split("/"),b=parseInt(c[0],10),c=parseInt(c[1],10),1==b&&(this.ad=[]),this.ad.push(a),b==c&&(Sk(this,this.ad.join("")),delete this.ad)}else Ji("received msg, but channel is not connected")};
g.Oe=function(a){Hi("ack received: "+a);"SETUP_ACK"==a?(this.Ib=!1,this.Md=!0,Rk(this)):this.$.Ed()?this.Ib?parseInt(a.split(":")[1],10)==this.Va?(this.Ib=!1,Tk(this)):Ji("got ack with wrong sequence"):Ji("got unexpected ack"):Ji("received ack, but channel not connected")};function Tk(a){if(!a.Ib&&a.Bc.length){var b=a.Bc.shift();++a.Va;a.Hd.send(a.Va+b);Hi("msg sent: "+a.Va+b);a.Ib=!0}}
function Sk(a,b){var c=b.indexOf(":"),d=b.substr(0,c),c=b.substring(c+1);a.$.Ed()?a.$.af(d,c):((a.yb||(a.yb=[])).push({Ue:d,Le:c}),Hi("queued delivery"))}g.fc=3800;g.send=function(a,b){var c=a+":"+b;if(!ib||b.length<=this.fc)this.Bc.push("|"+c);else for(var d=b.length,e=Math.ceil(d/this.fc),f=0,h=1;f<d;)this.Bc.push(","+h+"/"+e+"|"+c.substr(f,this.fc)),h++,f+=this.fc;Tk(this)};
g.kb=function(){Fk.dc.kb.call(this);var a=Uk;Qa(a,this.Gd);Qa(a,this.gd);this.Gd=this.gd=null;xb(this.Db);xb(this.tb);this.Zc=this.Jc=this.Db=this.tb=null};
var Uk=[],Vk=sa(function(){var a=Uk,b,c=!1;try{for(var d=0;b=a[d];d++){var e;if(!(e=c)){var f=b,h=f.Ld.location.href;if(h!=f.yd){f.yd=h;var k=h.split("#")[1];k&&(k=k.substr(1),f.Zd(decodeURIComponent(k)));e=!0}else e=!1}c=e}}catch(l){if(Ii&&Ii.info("receive_() failed: "+l,void 0),b.We.$.Mf(),!a.length)return}a=ta();c&&(Gk=a);Hk=window.setTimeout(Vk,1E3>a-Gk?10:100)},Fk);function Wk(){Ki(Ii,"starting receive-timer");Gk=ta();Hk&&window.clearTimeout(Hk);Hk=window.setTimeout(Vk,10)}
function Qk(a,b){if(!/^https?:\/\//.test(a))throw Error("URL "+a+" is invalid");this.Se=a;this.Rd=b;this.Tc=0}Qk.prototype.send=function(a){this.Tc=++this.Tc%2;a=this.Se+"#"+this.Tc+encodeURIComponent(a);try{lb?this.Rd.location.href=a:this.Rd.location.replace(a)}catch(b){Ii&&Ii.log(xi,"sending failed",b)}Wk()};function Ok(a,b,c){this.We=a;this.Ld=b;this.Zd=c;this.yd=this.Ld.location.href.split("#")[0]+"#INITIAL";Uk.push(this);Wk()};Gi("goog.net.WebSocket");xf.b(gf,He.b(function(a){var b=P(a,0);a=P(a,1);return new S(null,2,5,U,[Re.a(b.toLowerCase()),a],null)},Ig(wd([function(a){return gh(a)}({ef:"complete",uf:"success",ERROR:"error",bf:"abort",qf:"ready",rf:"readystatechange",TIMEOUT:"timeout",hf:"incrementaldata",pf:"progress"})],0))));
var Xk=function Xk(b){for(var c=[],d=arguments.length,e=0;;)if(e<d)c.push(arguments[e]),e+=1;else break;switch(c.length){case 2:return Xk.b(arguments[0],arguments[1]);case 3:return Xk.c(arguments[0],arguments[1],arguments[2]);case 4:return Xk.o(arguments[0],arguments[1],arguments[2],arguments[3]);case 5:return Xk.w(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]);case 6:return Xk.J(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);default:throw Error([G("Invalid arity: "),
G(c.length)].join(""));}};Xk.b=function(a,b){if(null!=a&&null!=a.sd)return a.sd(0,b);var c=Xk[y(null==a?null:a)];if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);c=Xk._;if(null!=c)return c.b?c.b(a,b):c.call(null,a,b);throw E("IConnection.transmit",a);};Xk.c=function(a,b,c){if(null!=a&&null!=a.td)return a.td(0,b,c);var d=Xk[y(null==a?null:a)];if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);d=Xk._;if(null!=d)return d.c?d.c(a,b,c):d.call(null,a,b,c);throw E("IConnection.transmit",a);};
Xk.o=function(a,b,c,d){if(null!=a&&null!=a.ud)return a.ud(0,b,c,d);var e=Xk[y(null==a?null:a)];if(null!=e)return e.o?e.o(a,b,c,d):e.call(null,a,b,c,d);e=Xk._;if(null!=e)return e.o?e.o(a,b,c,d):e.call(null,a,b,c,d);throw E("IConnection.transmit",a);};
Xk.w=function(a,b,c,d,e){if(null!=a&&null!=a.vd)return a.vd(0,b,c,d,e);var f=Xk[y(null==a?null:a)];if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);f=Xk._;if(null!=f)return f.w?f.w(a,b,c,d,e):f.call(null,a,b,c,d,e);throw E("IConnection.transmit",a);};
Xk.J=function(a,b,c,d,e,f){if(null!=a&&null!=a.wd)return a.wd(0,b,c,d,e,f);var h=Xk[y(null==a?null:a)];if(null!=h)return h.J?h.J(a,b,c,d,e,f):h.call(null,a,b,c,d,e,f);h=Xk._;if(null!=h)return h.J?h.J(a,b,c,d,e,f):h.call(null,a,b,c,d,e,f);throw E("IConnection.transmit",a);};Xk.A=6;g=kk.prototype;g.sd=function(a,b){return Xk.J(this,b,"GET",null,null,1E4)};g.td=function(a,b,c){return Xk.J(this,b,c,null,null,1E4)};g.ud=function(a,b,c,d){return Xk.J(this,b,c,d,null,1E4)};
g.vd=function(a,b,c,d,e){return Xk.J(this,b,c,d,e,1E4)};g.wd=function(a,b,c,d,e,f){this.Hb=Math.max(0,f);return this.send(b,c,d,e)};xf.b(gf,He.b(function(a){var b=P(a,0);a=P(a,1);return new S(null,2,5,U,[Re.a(b.toLowerCase()),a],null)},gh(Mi)));var Yk=V.a?V.a(null):V.call(null,null),Zk=[];function $k(a){Zk.push(pf.s(wd([a],0)));a=M.a?M.a(Yk):M.call(null,Yk);if(A(a)){for(var b=J(Zk),c=null,d=0,e=0;;)if(e<d){var f=c.O(null,e);Xk.c(a,Dh,f);e+=1}else if(b=J(b))c=b,re(c)?(b=Wc(c),e=Xc(c),c=b,d=O(b),b=e):(b=K(c),Xk.c(a,Dh,b),b=L(c),c=null,d=0),e=0;else break;if("array"!=y(Zk))for(a=Zk.length-1;0<=a;a--)delete Zk[a];Zk.length=0;a=void 0}else a=null;return a}Db=Cb=$k;V.a?V.a(0):V.call(null,0);Cb=function(){function a(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new I(e,0)}return b.call(this,d)}function b(a){return console.log.apply(console,Ob.a?Ob.a(a):Ob.call(null,a))}a.A=0;a.G=function(a){a=J(a);return b(a)};a.s=b;return a}();
Db=function(){function a(a){var d=null;if(0<arguments.length){for(var d=0,e=Array(arguments.length-0);d<e.length;)e[d]=arguments[d+0],++d;d=new I(e,0)}return b.call(this,d)}function b(a){return console.error.apply(console,Ob.a?Ob.a(a):Ob.call(null,a))}a.A=0;a.G=function(a){a=J(a);return b(a)};a.s=b;return a}();function al(a,b,c){var d=P(c,0);c=P(c,1);var e=new kk;ok.push(e);b&&e.Ha.add("complete",b,!1,void 0,void 0);e.Ha.add("ready",e.$d,!0,void 0,void 0);e.send(a,"POST",d,c)}var bl=null,cl=null;
function dl(){return null!=J(bl)?yf(function(a){return a.setMap(null)},bl):null}function el(){return yf(function(a){return a.setMap(cl)},bl)}
function fl(a){var b=[G(""),G("orders-since-date")].join(""),c=function(){var b=ch(new Ib(null,1,[wh,a],null));return JSON.stringify(b)}(),d=ch(new Ib(null,1,["Content-Type","application/json"],null));al(b,function(a,b,c){return function(d){d=d.target;var l;l=d.I?ak(d.I.responseText):void 0;var n=l.orders;return bl=yf(function(){return function(a){return new google.maps.Circle({strokeColor:"#ff0000",strokeOpacity:1,strokeWeight:2,fillColor:"#ff0000",fillOpacity:1,map:cl,center:{lat:a.lat,lng:a.lng},
radius:10})}}(d,l,n,a,b,c),n)}}(b,c,d),wd([c,d],0));return null}
function gl(a){var b=ni(wd([new S(null,2,5,U,[Gh,new Ib(null,2,[Ih,"setCenterUI",Eh,"Click to recenter the map"],null)],null)],0)),c=ni(wd([new S(null,2,5,U,[Kh,new Ib(null,5,[Ch,"checkbox",zh,"orders",Ah,"orders",Ih,"orders-checkbox",Jh,!0],null)],null)],0)),d=ni(wd([new S(null,2,5,U,[Kh,new Ib(null,3,[Ch,"text",zh,"orders-date",Ah,"2015-05-01"],null)],null)],0)),e=new Pikaday(function(){return{field:d,format:"YYYY-MM-DD",onSelect:function(a,b,c){return function(){dl();return fl(c.value)}}(b,c,d)}}()),
f=ni(wd([new S(null,6,5,U,[Gh,new Ib(null,1,[Ih,"setCenterText"],null),c,"Orders"," since date ",d],null)],0));a.appendChild(b);b.appendChild(f);c.addEventListener("click",function(a,b){return function(){return A(b.checked)?el():dl()}}(b,c,d,e,f))}
function hl(){cl=new google.maps.Map(document.getElementById("map"),{center:{lat:34.0714522,lng:-118.40362},zoom:16});var a=ni(wd([new S(null,1,5,U,[Gh],null)],0));a.index=1;gl(a);a.index=1;cl.controls[google.maps.ControlPosition.LEFT_TOP].push(a);return fl("2015-05-01")}var il=["dashboard_cljs","core","init_map"],jl=u;il[0]in jl||!jl.execScript||jl.execScript("var "+il[0]);for(var kl;il.length&&(kl=il.shift());)!il.length&&ba(hl)?jl[kl]=hl:jl=jl[kl]?jl[kl]:jl[kl]={};