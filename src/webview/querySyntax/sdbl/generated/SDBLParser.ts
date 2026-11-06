
import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


export class SDBLParser extends antlr.Parser {
    public static readonly WHITE_SPACE = 1;
    public static readonly LINE_COMMENT = 2;
    public static readonly DOT = 3;
    public static readonly LPAREN = 4;
    public static readonly RPAREN = 5;
    public static readonly SEMICOLON = 6;
    public static readonly COMMA = 7;
    public static readonly ASSIGN = 8;
    public static readonly PLUS = 9;
    public static readonly MINUS = 10;
    public static readonly LESS_OR_EQUAL = 11;
    public static readonly NOT_EQUAL = 12;
    public static readonly LESS = 13;
    public static readonly GREATER_OR_EQUAL = 14;
    public static readonly GREATER = 15;
    public static readonly MUL = 16;
    public static readonly QUOTIENT = 17;
    public static readonly NUMBER_SIGH = 18;
    public static readonly AMPERSAND = 19;
    public static readonly BRACE = 20;
    public static readonly ALLOWED = 21;
    public static readonly ADD = 22;
    public static readonly AND = 23;
    public static readonly AS = 24;
    public static readonly ASC = 25;
    public static readonly AUTOORDER = 26;
    public static readonly BETWEEN = 27;
    public static readonly BY = 28;
    public static readonly CASE = 29;
    public static readonly CAST = 30;
    public static readonly DESC = 31;
    public static readonly DISTINCT = 32;
    public static readonly DROP = 33;
    public static readonly ELSE = 34;
    public static readonly END = 35;
    public static readonly ESCAPE = 36;
    public static readonly FALSE = 37;
    public static readonly FROM = 38;
    public static readonly HAVING = 39;
    public static readonly INTO = 40;
    public static readonly IS = 41;
    public static readonly ISNULL = 42;
    public static readonly LIKE = 43;
    public static readonly NOT = 44;
    public static readonly NULL = 45;
    public static readonly OF = 46;
    public static readonly OR = 47;
    public static readonly OVERALL = 48;
    public static readonly SELECT = 49;
    public static readonly THEN = 50;
    public static readonly TOP = 51;
    public static readonly TOTALS = 52;
    public static readonly TRUE = 53;
    public static readonly UNDEFINED = 54;
    public static readonly WHEN = 55;
    public static readonly WHERE = 56;
    public static readonly ACOS = 57;
    public static readonly ASIN = 58;
    public static readonly ATAN = 59;
    public static readonly AVG = 60;
    public static readonly BEGINOFPERIOD = 61;
    public static readonly BOOLEAN = 62;
    public static readonly COS = 63;
    public static readonly COUNT = 64;
    public static readonly DATE = 65;
    public static readonly DATEADD = 66;
    public static readonly DATEDIFF = 67;
    public static readonly DATETIME = 68;
    public static readonly DAY = 69;
    public static readonly DAYOFYEAR = 70;
    public static readonly EMPTYTABLE = 71;
    public static readonly EMPTYREF = 72;
    public static readonly ENDOFPERIOD = 73;
    public static readonly EXP = 74;
    public static readonly HALFYEAR = 75;
    public static readonly HOUR = 76;
    public static readonly INT = 77;
    public static readonly LEFT = 78;
    public static readonly LOG = 79;
    public static readonly LOG10 = 80;
    public static readonly LOWER = 81;
    public static readonly MAX = 82;
    public static readonly MIN = 83;
    public static readonly MINUTE = 84;
    public static readonly MONTH = 85;
    public static readonly NUMBER = 86;
    public static readonly UNIQUE = 87;
    public static readonly QUARTER = 88;
    public static readonly PERIODS = 89;
    public static readonly REFS = 90;
    public static readonly PRESENTATION = 91;
    public static readonly RECORDAUTONUMBER = 92;
    public static readonly REFPRESENTATION = 93;
    public static readonly POW = 94;
    public static readonly RIGHT = 95;
    public static readonly ROUND = 96;
    public static readonly SECOND = 97;
    public static readonly SIN = 98;
    public static readonly SQRT = 99;
    public static readonly STOREDDATASIZE = 100;
    public static readonly STRING = 101;
    public static readonly STRINGLENGTH = 102;
    public static readonly STRFIND = 103;
    public static readonly STRREPLACE = 104;
    public static readonly SUBSTRING = 105;
    public static readonly SUM = 106;
    public static readonly TAN = 107;
    public static readonly TENDAYS = 108;
    public static readonly TRIMALL = 109;
    public static readonly TRIML = 110;
    public static readonly TRIMR = 111;
    public static readonly TYPE = 112;
    public static readonly UPPER = 113;
    public static readonly VALUE = 114;
    public static readonly VALUETYPE = 115;
    public static readonly WEEK = 116;
    public static readonly WEEKDAY = 117;
    public static readonly YEAR = 118;
    public static readonly UUID = 119;
    public static readonly ACCOUNTING_REGISTER_TYPE = 120;
    public static readonly ACCUMULATION_REGISTER_TYPE = 121;
    public static readonly BUSINESS_PROCESS_TYPE = 122;
    public static readonly CALCULATION_REGISTER_TYPE = 123;
    public static readonly CATALOG_TYPE = 124;
    public static readonly CHART_OF_ACCOUNTS_TYPE = 125;
    public static readonly CHART_OF_CALCULATION_TYPES_TYPE = 126;
    public static readonly CHART_OF_CHARACTERISTIC_TYPES_TYPE = 127;
    public static readonly CONSTANT_TYPE = 128;
    public static readonly DOCUMENT_TYPE = 129;
    public static readonly DOCUMENT_JOURNAL_TYPE = 130;
    public static readonly ENUM_TYPE = 131;
    public static readonly EXCHANGE_PLAN_TYPE = 132;
    public static readonly EXTERNAL_DATA_SOURCE_TYPE = 133;
    public static readonly FILTER_CRITERION_TYPE = 134;
    public static readonly INFORMATION_REGISTER_TYPE = 135;
    public static readonly SEQUENCE_TYPE = 136;
    public static readonly TASK_TYPE = 137;
    public static readonly ROUTEPOINT_FIELD = 138;
    public static readonly INDEX_BY_SETS = 139;
    public static readonly INDEX_BY = 140;
    public static readonly GROUP_BY_GROUPING_SETS = 141;
    public static readonly GROUP_BY = 142;
    public static readonly ORDER_BY = 143;
    public static readonly FOR_UPDATE = 144;
    public static readonly RIGHT_OUTER_JOIN = 145;
    public static readonly RIGHT_JOIN = 146;
    public static readonly LEFT_OUTER_JOIN = 147;
    public static readonly LEFT_JOIN = 148;
    public static readonly FULL_OUTER_JOIN = 149;
    public static readonly FULL_JOIN = 150;
    public static readonly INNER_JOIN = 151;
    public static readonly JOIN = 152;
    public static readonly UNION_ALL = 153;
    public static readonly UNION = 154;
    public static readonly ONLY_HIERARCHY = 155;
    public static readonly HIERARCHY = 156;
    public static readonly IN_HIERARCHY = 157;
    public static readonly IN = 158;
    public static readonly GROUPEDBY = 159;
    public static readonly DECIMAL = 160;
    public static readonly FLOAT = 161;
    public static readonly INCORRECT_IDENTIFIER = 162;
    public static readonly IDENTIFIER = 163;
    public static readonly UNKNOWN = 164;
    public static readonly PARAMETER_IDENTIFIER = 165;
    public static readonly ACTUAL_ACTION_PERIOD_VT = 166;
    public static readonly BALANCE_VT = 167;
    public static readonly BALANCE_AND_TURNOVERS_VT = 168;
    public static readonly BOUNDARIES_VT = 169;
    public static readonly DR_CR_TURNOVERS_VT = 170;
    public static readonly EXT_DIMENSIONS_VT = 171;
    public static readonly RECORDS_WITH_EXT_DIMENSIONS_VT = 172;
    public static readonly SCHEDULE_DATA_VT = 173;
    public static readonly SLICEFIRST_VT = 174;
    public static readonly SLICELAST_VT = 175;
    public static readonly TASK_BY_PERFORMER_VT = 176;
    public static readonly TURNOVERS_VT = 177;
    public static readonly BRACE_START = 178;
    public static readonly EDS_TABLE = 179;
    public static readonly EDS_CUBE = 180;
    public static readonly EDS_CUBE_DIMTABLE = 181;
    public static readonly STR = 182;
    public static readonly RULE_queryPackage = 0;
    public static readonly RULE_queries = 1;
    public static readonly RULE_dropTableQuery = 2;
    public static readonly RULE_selectQuery = 3;
    public static readonly RULE_subquery = 4;
    public static readonly RULE_union = 5;
    public static readonly RULE_query = 6;
    public static readonly RULE_limitations = 7;
    public static readonly RULE_top = 8;
    public static readonly RULE_selectedFields = 9;
    public static readonly RULE_selectedField = 10;
    public static readonly RULE_asteriskField = 11;
    public static readonly RULE_expressionField = 12;
    public static readonly RULE_columnField = 13;
    public static readonly RULE_emptyTableField = 14;
    public static readonly RULE_emptyTableColumns = 15;
    public static readonly RULE_inlineTableField = 16;
    public static readonly RULE_recordAutoNumberFunction = 17;
    public static readonly RULE_indexingItem = 18;
    public static readonly RULE_indexingSet = 19;
    public static readonly RULE_orderBy = 20;
    public static readonly RULE_ordersByExpression = 21;
    public static readonly RULE_totalBy = 22;
    public static readonly RULE_totalsGroup = 23;
    public static readonly RULE_periodic = 24;
    public static readonly RULE_column = 25;
    public static readonly RULE_expression = 26;
    public static readonly RULE_primitiveExpression = 27;
    public static readonly RULE_caseExpression = 28;
    public static readonly RULE_caseBranch = 29;
    public static readonly RULE_bracketExpression = 30;
    public static readonly RULE_unaryExpression = 31;
    public static readonly RULE_functionCall = 32;
    public static readonly RULE_builtInFunctions = 33;
    public static readonly RULE_aggregateFunctions = 34;
    public static readonly RULE_valueFunction = 35;
    public static readonly RULE_castFunction = 36;
    public static readonly RULE_logicalExpression = 37;
    public static readonly RULE_predicate = 38;
    public static readonly RULE_likePredicate = 39;
    public static readonly RULE_isNullPredicate = 40;
    public static readonly RULE_comparePredicate = 41;
    public static readonly RULE_betweenPredicate = 42;
    public static readonly RULE_inPredicate = 43;
    public static readonly RULE_refsPredicate = 44;
    public static readonly RULE_expressionList = 45;
    public static readonly RULE_expressionListItem = 46;
    public static readonly RULE_dataSources = 47;
    public static readonly RULE_dataSource = 48;
    public static readonly RULE_table = 49;
    public static readonly RULE_virtualTable = 50;
    public static readonly RULE_virtualTableParameter = 51;
    public static readonly RULE_parameterTable = 52;
    public static readonly RULE_externalDataSourceTable = 53;
    public static readonly RULE_joinPart = 54;
    public static readonly RULE_rightJoin = 55;
    public static readonly RULE_leftJoin = 56;
    public static readonly RULE_fullJoin = 57;
    public static readonly RULE_innerJoin = 58;
    public static readonly RULE_alias = 59;
    public static readonly RULE_datePart = 60;
    public static readonly RULE_multiString = 61;
    public static readonly RULE_sign = 62;
    public static readonly RULE_identifier = 63;
    public static readonly RULE_temporaryTableIdentifier = 64;
    public static readonly RULE_parameter = 65;
    public static readonly RULE_mdo = 66;

    public static readonly literalNames = [
        null, null, null, "'.'", "'('", "')'", "';'", "','", "'='", "'+'", 
        "'-'", "'<='", "'<>'", "'<'", "'>='", "'>'", "'*'", "'/'", "'#'", 
        "'&'", null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, "'NULL'", "'OF'", null, null, null, null, 
        null, null, null, null, null, null, "'ACOS'", "'ASIN'", "'ATAN'", 
        null, null, null, "'COS'", null, null, null, null, null, null, null, 
        null, null, null, "'EXP'", null, null, null, null, "'LOG'", "'LOG10'", 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, "'POW'", null, null, null, "'SIN'", "'SQRT'", null, 
        null, null, null, null, null, null, "'TAN'", null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, "'\"'"
    ];

    public static readonly symbolicNames = [
        null, "WHITE_SPACE", "LINE_COMMENT", "DOT", "LPAREN", "RPAREN", 
        "SEMICOLON", "COMMA", "ASSIGN", "PLUS", "MINUS", "LESS_OR_EQUAL", 
        "NOT_EQUAL", "LESS", "GREATER_OR_EQUAL", "GREATER", "MUL", "QUOTIENT", 
        "NUMBER_SIGH", "AMPERSAND", "BRACE", "ALLOWED", "ADD", "AND", "AS", 
        "ASC", "AUTOORDER", "BETWEEN", "BY", "CASE", "CAST", "DESC", "DISTINCT", 
        "DROP", "ELSE", "END", "ESCAPE", "FALSE", "FROM", "HAVING", "INTO", 
        "IS", "ISNULL", "LIKE", "NOT", "NULL", "OF", "OR", "OVERALL", "SELECT", 
        "THEN", "TOP", "TOTALS", "TRUE", "UNDEFINED", "WHEN", "WHERE", "ACOS", 
        "ASIN", "ATAN", "AVG", "BEGINOFPERIOD", "BOOLEAN", "COS", "COUNT", 
        "DATE", "DATEADD", "DATEDIFF", "DATETIME", "DAY", "DAYOFYEAR", "EMPTYTABLE", 
        "EMPTYREF", "ENDOFPERIOD", "EXP", "HALFYEAR", "HOUR", "INT", "LEFT", 
        "LOG", "LOG10", "LOWER", "MAX", "MIN", "MINUTE", "MONTH", "NUMBER", 
        "UNIQUE", "QUARTER", "PERIODS", "REFS", "PRESENTATION", "RECORDAUTONUMBER", 
        "REFPRESENTATION", "POW", "RIGHT", "ROUND", "SECOND", "SIN", "SQRT", 
        "STOREDDATASIZE", "STRING", "STRINGLENGTH", "STRFIND", "STRREPLACE", 
        "SUBSTRING", "SUM", "TAN", "TENDAYS", "TRIMALL", "TRIML", "TRIMR", 
        "TYPE", "UPPER", "VALUE", "VALUETYPE", "WEEK", "WEEKDAY", "YEAR", 
        "UUID", "ACCOUNTING_REGISTER_TYPE", "ACCUMULATION_REGISTER_TYPE", 
        "BUSINESS_PROCESS_TYPE", "CALCULATION_REGISTER_TYPE", "CATALOG_TYPE", 
        "CHART_OF_ACCOUNTS_TYPE", "CHART_OF_CALCULATION_TYPES_TYPE", "CHART_OF_CHARACTERISTIC_TYPES_TYPE", 
        "CONSTANT_TYPE", "DOCUMENT_TYPE", "DOCUMENT_JOURNAL_TYPE", "ENUM_TYPE", 
        "EXCHANGE_PLAN_TYPE", "EXTERNAL_DATA_SOURCE_TYPE", "FILTER_CRITERION_TYPE", 
        "INFORMATION_REGISTER_TYPE", "SEQUENCE_TYPE", "TASK_TYPE", "ROUTEPOINT_FIELD", 
        "INDEX_BY_SETS", "INDEX_BY", "GROUP_BY_GROUPING_SETS", "GROUP_BY", 
        "ORDER_BY", "FOR_UPDATE", "RIGHT_OUTER_JOIN", "RIGHT_JOIN", "LEFT_OUTER_JOIN", 
        "LEFT_JOIN", "FULL_OUTER_JOIN", "FULL_JOIN", "INNER_JOIN", "JOIN", 
        "UNION_ALL", "UNION", "ONLY_HIERARCHY", "HIERARCHY", "IN_HIERARCHY", 
        "IN", "GROUPEDBY", "DECIMAL", "FLOAT", "INCORRECT_IDENTIFIER", "IDENTIFIER", 
        "UNKNOWN", "PARAMETER_IDENTIFIER", "ACTUAL_ACTION_PERIOD_VT", "BALANCE_VT", 
        "BALANCE_AND_TURNOVERS_VT", "BOUNDARIES_VT", "DR_CR_TURNOVERS_VT", 
        "EXT_DIMENSIONS_VT", "RECORDS_WITH_EXT_DIMENSIONS_VT", "SCHEDULE_DATA_VT", 
        "SLICEFIRST_VT", "SLICELAST_VT", "TASK_BY_PERFORMER_VT", "TURNOVERS_VT", 
        "BRACE_START", "EDS_TABLE", "EDS_CUBE", "EDS_CUBE_DIMTABLE", "STR"
    ];
    public static readonly ruleNames = [
        "queryPackage", "queries", "dropTableQuery", "selectQuery", "subquery", 
        "union", "query", "limitations", "top", "selectedFields", "selectedField", 
        "asteriskField", "expressionField", "columnField", "emptyTableField", 
        "emptyTableColumns", "inlineTableField", "recordAutoNumberFunction", 
        "indexingItem", "indexingSet", "orderBy", "ordersByExpression", 
        "totalBy", "totalsGroup", "periodic", "column", "expression", "primitiveExpression", 
        "caseExpression", "caseBranch", "bracketExpression", "unaryExpression", 
        "functionCall", "builtInFunctions", "aggregateFunctions", "valueFunction", 
        "castFunction", "logicalExpression", "predicate", "likePredicate", 
        "isNullPredicate", "comparePredicate", "betweenPredicate", "inPredicate", 
        "refsPredicate", "expressionList", "expressionListItem", "dataSources", 
        "dataSource", "table", "virtualTable", "virtualTableParameter", 
        "parameterTable", "externalDataSourceTable", "joinPart", "rightJoin", 
        "leftJoin", "fullJoin", "innerJoin", "alias", "datePart", "multiString", 
        "sign", "identifier", "temporaryTableIdentifier", "parameter", "mdo",
    ];

    public get grammarFileName(): string { return "SDBLParser.g4"; }
    public get literalNames(): (string | null)[] { return SDBLParser.literalNames; }
    public get symbolicNames(): (string | null)[] { return SDBLParser.symbolicNames; }
    public get ruleNames(): string[] { return SDBLParser.ruleNames; }
    public get serializedATN(): number[] { return SDBLParser._serializedATN; }

    protected createFailedPredicateException(predicate?: string, message?: string): antlr.FailedPredicateException {
        return new antlr.FailedPredicateException(this, predicate, message);
    }

    public constructor(input: antlr.TokenStream) {
        super(input);
        this.interpreter = new antlr.ParserATNSimulator(this, SDBLParser._ATN, SDBLParser.decisionsToDFA, new antlr.PredictionContextCache());
    }
    public queryPackage(): QueryPackageContext {
        let localContext = new QueryPackageContext(this.context, this.state);
        this.enterRule(localContext, 0, SDBLParser.RULE_queryPackage);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 134;
            this.queries();
            this.state = 139;
            this.errorHandler.sync(this);
            alternative = this.interpreter.adaptivePredict(this.tokenStream, 0, this.context);
            while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                if (alternative === 1) {
                    {
                    {
                    this.state = 135;
                    this.match(SDBLParser.SEMICOLON);
                    this.state = 136;
                    this.queries();
                    }
                    }
                }
                this.state = 141;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 0, this.context);
            }
            this.state = 143;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 6) {
                {
                this.state = 142;
                this.match(SDBLParser.SEMICOLON);
                }
            }

            this.state = 145;
            this.match(SDBLParser.EOF);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public queries(): QueriesContext {
        let localContext = new QueriesContext(this.context, this.state);
        this.enterRule(localContext, 2, SDBLParser.RULE_queries);
        try {
            this.state = 149;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.SELECT:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 147;
                this.selectQuery();
                }
                break;
            case SDBLParser.DROP:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 148;
                this.dropTableQuery();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public dropTableQuery(): DropTableQueryContext {
        let localContext = new DropTableQueryContext(this.context, this.state);
        this.enterRule(localContext, 4, SDBLParser.RULE_dropTableQuery);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 151;
            this.match(SDBLParser.DROP);
            this.state = 152;
            localContext._temporaryTableName = this.identifier();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public selectQuery(): SelectQueryContext {
        let localContext = new SelectQueryContext(this.context, this.state);
        this.enterRule(localContext, 6, SDBLParser.RULE_selectQuery);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 154;
            this.subquery();
            this.state = 181;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 6, this.context) ) {
            case 1:
                {
                {
                this.state = 155;
                localContext._autoorder = this.match(SDBLParser.AUTOORDER);
                this.state = 156;
                localContext._orders = this.orderBy();
                this.state = 157;
                localContext._totals = this.totalBy();
                }
                }
                break;
            case 2:
                {
                {
                this.state = 159;
                localContext._orders = this.orderBy();
                this.state = 160;
                localContext._autoorder = this.match(SDBLParser.AUTOORDER);
                this.state = 161;
                localContext._totals = this.totalBy();
                }
                }
                break;
            case 3:
                {
                {
                this.state = 163;
                localContext._orders = this.orderBy();
                this.state = 164;
                localContext._totals = this.totalBy();
                this.state = 165;
                localContext._autoorder = this.match(SDBLParser.AUTOORDER);
                }
                }
                break;
            case 4:
                {
                {
                this.state = 167;
                localContext._autoorder = this.match(SDBLParser.AUTOORDER);
                this.state = 170;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case SDBLParser.ORDER_BY:
                    {
                    this.state = 168;
                    localContext._orders = this.orderBy();
                    }
                    break;
                case SDBLParser.TOTALS:
                    {
                    this.state = 169;
                    localContext._totals = this.totalBy();
                    }
                    break;
                case SDBLParser.EOF:
                case SDBLParser.SEMICOLON:
                    break;
                default:
                    break;
                }
                }
                }
                break;
            case 5:
                {
                {
                this.state = 172;
                localContext._orders = this.orderBy();
                this.state = 175;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case SDBLParser.AUTOORDER:
                    {
                    this.state = 173;
                    localContext._autoorder = this.match(SDBLParser.AUTOORDER);
                    }
                    break;
                case SDBLParser.TOTALS:
                    {
                    this.state = 174;
                    localContext._totals = this.totalBy();
                    }
                    break;
                case SDBLParser.EOF:
                case SDBLParser.SEMICOLON:
                    break;
                default:
                    break;
                }
                }
                }
                break;
            case 6:
                {
                {
                this.state = 177;
                localContext._totals = this.totalBy();
                this.state = 179;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 26) {
                    {
                    this.state = 178;
                    localContext._autoorder = this.match(SDBLParser.AUTOORDER);
                    }
                }

                }
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public subquery(): SubqueryContext {
        let localContext = new SubqueryContext(this.context, this.state);
        this.enterRule(localContext, 8, SDBLParser.RULE_subquery);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 183;
            localContext._main = this.query();
            this.state = 185;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 7, this.context) ) {
            case 1:
                {
                this.state = 184;
                this.orderBy();
                }
                break;
            }
            this.state = 192;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 153 || _la === 154) {
                {
                this.state = 188;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                do {
                    {
                    {
                    this.state = 187;
                    localContext._union = this.union();
                    localContext._unions.push(localContext._union!);
                    }
                    }
                    this.state = 190;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                } while (_la === 153 || _la === 154);
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public union(): UnionContext {
        let localContext = new UnionContext(this.context, this.state);
        this.enterRule(localContext, 10, SDBLParser.RULE_union);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 194;
            localContext._unionType = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(_la === 153 || _la === 154)) {
                localContext._unionType = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 195;
            this.query();
            this.state = 197;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 10, this.context) ) {
            case 1:
                {
                this.state = 196;
                this.orderBy();
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public query(): QueryContext {
        let localContext = new QueryContext(this.context, this.state);
        this.enterRule(localContext, 12, SDBLParser.RULE_query);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 199;
            this.match(SDBLParser.SELECT);
            this.state = 201;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (((((_la - 21)) & ~0x1F) === 0 && ((1 << (_la - 21)) & 1073743873) !== 0)) {
                {
                this.state = 200;
                this.limitations();
                }
            }

            this.state = 203;
            localContext._columns = this.selectedFields();
            this.state = 206;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 22 || _la === 40) {
                {
                this.state = 204;
                _la = this.tokenStream.LA(1);
                if(!(_la === 22 || _la === 40)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 205;
                localContext._temporaryTableName = this.temporaryTableIdentifier();
                }
            }

            this.state = 210;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 38) {
                {
                this.state = 208;
                this.match(SDBLParser.FROM);
                this.state = 209;
                localContext._from_ = this.dataSources();
                }
            }

            this.state = 214;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 56) {
                {
                this.state = 212;
                this.match(SDBLParser.WHERE);
                this.state = 213;
                localContext._where = this.logicalExpression();
                }
            }

            this.state = 242;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.GROUP_BY_GROUPING_SETS:
                {
                {
                this.state = 216;
                this.match(SDBLParser.GROUP_BY_GROUPING_SETS);
                this.state = 217;
                this.match(SDBLParser.LPAREN);
                {
                this.state = 218;
                this.match(SDBLParser.LPAREN);
                this.state = 219;
                localContext._expressionList = this.expressionList();
                localContext._groupingSet.push(localContext._expressionList!);
                this.state = 220;
                this.match(SDBLParser.RPAREN);
                this.state = 228;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 7) {
                    {
                    {
                    this.state = 221;
                    this.match(SDBLParser.COMMA);
                    this.state = 222;
                    this.match(SDBLParser.LPAREN);
                    this.state = 223;
                    localContext._expressionList = this.expressionList();
                    localContext._groupingSet.push(localContext._expressionList!);
                    this.state = 224;
                    this.match(SDBLParser.RPAREN);
                    }
                    }
                    this.state = 230;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
                this.state = 231;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.GROUP_BY:
                {
                {
                this.state = 233;
                this.match(SDBLParser.GROUP_BY);
                this.state = 234;
                localContext._expression = this.expression(0);
                localContext._groupBy.push(localContext._expression!);
                this.state = 239;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 7) {
                    {
                    {
                    this.state = 235;
                    this.match(SDBLParser.COMMA);
                    this.state = 236;
                    localContext._expression = this.expression(0);
                    localContext._groupBy.push(localContext._expression!);
                    }
                    }
                    this.state = 241;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
                }
                break;
            case SDBLParser.EOF:
            case SDBLParser.RPAREN:
            case SDBLParser.SEMICOLON:
            case SDBLParser.AUTOORDER:
            case SDBLParser.HAVING:
            case SDBLParser.TOTALS:
            case SDBLParser.INDEX_BY_SETS:
            case SDBLParser.INDEX_BY:
            case SDBLParser.ORDER_BY:
            case SDBLParser.FOR_UPDATE:
            case SDBLParser.UNION_ALL:
            case SDBLParser.UNION:
                break;
            default:
                break;
            }
            this.state = 246;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 39) {
                {
                this.state = 244;
                this.match(SDBLParser.HAVING);
                this.state = 245;
                localContext._having = this.logicalExpression();
                }
            }

            this.state = 252;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 144) {
                {
                this.state = 248;
                this.match(SDBLParser.FOR_UPDATE);
                this.state = 250;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (((((_la - 120)) & ~0x1F) === 0 && ((1 << (_la - 120)) & 262143) !== 0)) {
                    {
                    this.state = 249;
                    localContext._forUpdate = this.mdo();
                    }
                }

                }
            }

            this.state = 281;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.INDEX_BY_SETS:
                {
                {
                this.state = 254;
                this.match(SDBLParser.INDEX_BY_SETS);
                this.state = 255;
                this.match(SDBLParser.LPAREN);
                this.state = 256;
                localContext._indexingSet = this.indexingSet();
                localContext._indexSets.push(localContext._indexingSet!);
                this.state = 261;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 7) {
                    {
                    {
                    this.state = 257;
                    this.match(SDBLParser.COMMA);
                    this.state = 258;
                    localContext._indexingSet = this.indexingSet();
                    localContext._indexSets.push(localContext._indexingSet!);
                    }
                    }
                    this.state = 263;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                this.state = 264;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.INDEX_BY:
                {
                {
                this.state = 266;
                this.match(SDBLParser.INDEX_BY);
                this.state = 267;
                localContext._indexingItem = this.indexingItem();
                localContext._indexes.push(localContext._indexingItem!);
                this.state = 269;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 87) {
                    {
                    this.state = 268;
                    this.match(SDBLParser.UNIQUE);
                    }
                }

                this.state = 278;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 7) {
                    {
                    {
                    this.state = 271;
                    this.match(SDBLParser.COMMA);
                    this.state = 272;
                    localContext._indexingItem = this.indexingItem();
                    localContext._indexes.push(localContext._indexingItem!);
                    this.state = 274;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                    if (_la === 87) {
                        {
                        this.state = 273;
                        this.match(SDBLParser.UNIQUE);
                        }
                    }

                    }
                    }
                    this.state = 280;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
                }
                break;
            case SDBLParser.EOF:
            case SDBLParser.RPAREN:
            case SDBLParser.SEMICOLON:
            case SDBLParser.AUTOORDER:
            case SDBLParser.TOTALS:
            case SDBLParser.ORDER_BY:
            case SDBLParser.UNION_ALL:
            case SDBLParser.UNION:
                break;
            default:
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public limitations(): LimitationsContext {
        let localContext = new LimitationsContext(this.context, this.state);
        this.enterRule(localContext, 14, SDBLParser.RULE_limitations);
        try {
            this.state = 324;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 27, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 286;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case SDBLParser.TOP:
                    {
                    this.state = 283;
                    this.top();
                    }
                    break;
                case SDBLParser.DISTINCT:
                    {
                    this.state = 284;
                    this.match(SDBLParser.DISTINCT);
                    }
                    break;
                case SDBLParser.ALLOWED:
                    {
                    this.state = 285;
                    this.match(SDBLParser.ALLOWED);
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 288;
                this.match(SDBLParser.ALLOWED);
                this.state = 289;
                this.match(SDBLParser.DISTINCT);
                this.state = 290;
                this.top();
                }
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                {
                this.state = 291;
                this.match(SDBLParser.ALLOWED);
                this.state = 292;
                this.top();
                this.state = 293;
                this.match(SDBLParser.DISTINCT);
                }
                }
                break;
            case 4:
                this.enterOuterAlt(localContext, 4);
                {
                {
                this.state = 295;
                this.top();
                this.state = 296;
                this.match(SDBLParser.ALLOWED);
                this.state = 297;
                this.match(SDBLParser.DISTINCT);
                }
                }
                break;
            case 5:
                this.enterOuterAlt(localContext, 5);
                {
                {
                this.state = 299;
                this.top();
                this.state = 300;
                this.match(SDBLParser.DISTINCT);
                this.state = 301;
                this.match(SDBLParser.ALLOWED);
                }
                }
                break;
            case 6:
                this.enterOuterAlt(localContext, 6);
                {
                {
                this.state = 303;
                this.match(SDBLParser.DISTINCT);
                this.state = 304;
                this.match(SDBLParser.ALLOWED);
                this.state = 305;
                this.top();
                }
                }
                break;
            case 7:
                this.enterOuterAlt(localContext, 7);
                {
                {
                this.state = 306;
                this.match(SDBLParser.DISTINCT);
                this.state = 307;
                this.top();
                this.state = 308;
                this.match(SDBLParser.ALLOWED);
                }
                }
                break;
            case 8:
                this.enterOuterAlt(localContext, 8);
                {
                {
                this.state = 310;
                this.match(SDBLParser.ALLOWED);
                this.state = 311;
                this.match(SDBLParser.DISTINCT);
                }
                }
                break;
            case 9:
                this.enterOuterAlt(localContext, 9);
                {
                {
                this.state = 312;
                this.match(SDBLParser.ALLOWED);
                this.state = 313;
                this.top();
                }
                }
                break;
            case 10:
                this.enterOuterAlt(localContext, 10);
                {
                {
                this.state = 314;
                this.match(SDBLParser.DISTINCT);
                this.state = 315;
                this.match(SDBLParser.ALLOWED);
                }
                }
                break;
            case 11:
                this.enterOuterAlt(localContext, 11);
                {
                {
                this.state = 316;
                this.match(SDBLParser.DISTINCT);
                this.state = 317;
                this.top();
                }
                }
                break;
            case 12:
                this.enterOuterAlt(localContext, 12);
                {
                {
                this.state = 318;
                this.top();
                this.state = 319;
                this.match(SDBLParser.ALLOWED);
                }
                }
                break;
            case 13:
                this.enterOuterAlt(localContext, 13);
                {
                {
                this.state = 321;
                this.top();
                this.state = 322;
                this.match(SDBLParser.DISTINCT);
                }
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public top(): TopContext {
        let localContext = new TopContext(this.context, this.state);
        this.enterRule(localContext, 16, SDBLParser.RULE_top);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 326;
            this.match(SDBLParser.TOP);
            this.state = 327;
            localContext._count = this.match(SDBLParser.DECIMAL);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public selectedFields(): SelectedFieldsContext {
        let localContext = new SelectedFieldsContext(this.context, this.state);
        this.enterRule(localContext, 18, SDBLParser.RULE_selectedFields);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 329;
            localContext._selectedField = this.selectedField();
            localContext._fields.push(localContext._selectedField!);
            this.state = 334;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 330;
                this.match(SDBLParser.COMMA);
                this.state = 331;
                localContext._selectedField = this.selectedField();
                localContext._fields.push(localContext._selectedField!);
                }
                }
                this.state = 336;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public selectedField(): SelectedFieldContext {
        let localContext = new SelectedFieldContext(this.context, this.state);
        this.enterRule(localContext, 20, SDBLParser.RULE_selectedField);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 342;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 29, this.context) ) {
            case 1:
                {
                this.state = 337;
                this.asteriskField();
                }
                break;
            case 2:
                {
                this.state = 338;
                this.columnField();
                }
                break;
            case 3:
                {
                this.state = 339;
                this.emptyTableField();
                }
                break;
            case 4:
                {
                this.state = 340;
                this.inlineTableField();
                }
                break;
            case 5:
                {
                this.state = 341;
                this.expressionField();
                }
                break;
            }
            this.state = 345;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 30, this.context) ) {
            case 1:
                {
                this.state = 344;
                this.alias();
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public asteriskField(): AsteriskFieldContext {
        let localContext = new AsteriskFieldContext(this.context, this.state);
        this.enterRule(localContext, 22, SDBLParser.RULE_asteriskField);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 352;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4278780421) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 4290772991) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4294967295) !== 0) || ((((_la - 129)) & ~0x1F) === 0 && ((1 << (_la - 129)) & 41944063) !== 0) || ((((_la - 163)) & ~0x1F) === 0 && ((1 << (_la - 163)) & 32761) !== 0)) {
                {
                {
                this.state = 347;
                localContext._tableName = this.identifier();
                this.state = 348;
                this.match(SDBLParser.DOT);
                }
                }
                this.state = 354;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 355;
            this.match(SDBLParser.MUL);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public expressionField(): ExpressionFieldContext {
        let localContext = new ExpressionFieldContext(this.context, this.state);
        this.enterRule(localContext, 24, SDBLParser.RULE_expressionField);
        try {
            this.state = 359;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 32, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 357;
                this.expression(0);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 358;
                this.logicalExpression();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public columnField(): ColumnFieldContext {
        let localContext = new ColumnFieldContext(this.context, this.state);
        this.enterRule(localContext, 26, SDBLParser.RULE_columnField);
        try {
            this.state = 363;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.NULL:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 361;
                this.match(SDBLParser.NULL);
                }
                break;
            case SDBLParser.RECORDAUTONUMBER:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 362;
                this.recordAutoNumberFunction();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public emptyTableField(): EmptyTableFieldContext {
        let localContext = new EmptyTableFieldContext(this.context, this.state);
        this.enterRule(localContext, 28, SDBLParser.RULE_emptyTableField);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 365;
            localContext._emptyTable = this.match(SDBLParser.EMPTYTABLE);
            this.state = 366;
            this.match(SDBLParser.DOT);
            this.state = 367;
            this.match(SDBLParser.LPAREN);
            this.state = 368;
            this.emptyTableColumns();
            this.state = 369;
            this.match(SDBLParser.RPAREN);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public emptyTableColumns(): EmptyTableColumnsContext {
        let localContext = new EmptyTableColumnsContext(this.context, this.state);
        this.enterRule(localContext, 30, SDBLParser.RULE_emptyTableColumns);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 371;
            localContext._alias = this.alias();
            localContext._columns.push(localContext._alias!);
            this.state = 376;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 372;
                this.match(SDBLParser.COMMA);
                this.state = 373;
                localContext._alias = this.alias();
                localContext._columns.push(localContext._alias!);
                }
                }
                this.state = 378;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public inlineTableField(): InlineTableFieldContext {
        let localContext = new InlineTableFieldContext(this.context, this.state);
        this.enterRule(localContext, 32, SDBLParser.RULE_inlineTableField);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 379;
            localContext._inlineTable = this.column();
            this.state = 380;
            this.match(SDBLParser.DOT);
            this.state = 381;
            this.match(SDBLParser.LPAREN);
            this.state = 382;
            localContext._inlineTableFields = this.selectedFields();
            this.state = 383;
            this.match(SDBLParser.RPAREN);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public recordAutoNumberFunction(): RecordAutoNumberFunctionContext {
        let localContext = new RecordAutoNumberFunctionContext(this.context, this.state);
        this.enterRule(localContext, 34, SDBLParser.RULE_recordAutoNumberFunction);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 385;
            localContext._doCall = this.match(SDBLParser.RECORDAUTONUMBER);
            this.state = 386;
            this.match(SDBLParser.LPAREN);
            this.state = 387;
            this.match(SDBLParser.RPAREN);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public indexingItem(): IndexingItemContext {
        let localContext = new IndexingItemContext(this.context, this.state);
        this.enterRule(localContext, 36, SDBLParser.RULE_indexingItem);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 391;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.AMPERSAND:
                {
                this.state = 389;
                this.parameter();
                }
                break;
            case SDBLParser.DROP:
            case SDBLParser.END:
            case SDBLParser.ISNULL:
            case SDBLParser.SELECT:
            case SDBLParser.TOTALS:
            case SDBLParser.ACOS:
            case SDBLParser.ASIN:
            case SDBLParser.ATAN:
            case SDBLParser.AVG:
            case SDBLParser.BEGINOFPERIOD:
            case SDBLParser.BOOLEAN:
            case SDBLParser.COS:
            case SDBLParser.COUNT:
            case SDBLParser.DATE:
            case SDBLParser.DATEADD:
            case SDBLParser.DATEDIFF:
            case SDBLParser.DATETIME:
            case SDBLParser.DAY:
            case SDBLParser.DAYOFYEAR:
            case SDBLParser.EMPTYTABLE:
            case SDBLParser.EMPTYREF:
            case SDBLParser.ENDOFPERIOD:
            case SDBLParser.EXP:
            case SDBLParser.HALFYEAR:
            case SDBLParser.HOUR:
            case SDBLParser.INT:
            case SDBLParser.LEFT:
            case SDBLParser.LOG:
            case SDBLParser.LOG10:
            case SDBLParser.LOWER:
            case SDBLParser.MAX:
            case SDBLParser.MIN:
            case SDBLParser.MINUTE:
            case SDBLParser.MONTH:
            case SDBLParser.NUMBER:
            case SDBLParser.QUARTER:
            case SDBLParser.PERIODS:
            case SDBLParser.REFS:
            case SDBLParser.PRESENTATION:
            case SDBLParser.RECORDAUTONUMBER:
            case SDBLParser.REFPRESENTATION:
            case SDBLParser.POW:
            case SDBLParser.RIGHT:
            case SDBLParser.ROUND:
            case SDBLParser.SECOND:
            case SDBLParser.SIN:
            case SDBLParser.SQRT:
            case SDBLParser.STOREDDATASIZE:
            case SDBLParser.STRING:
            case SDBLParser.STRINGLENGTH:
            case SDBLParser.STRFIND:
            case SDBLParser.STRREPLACE:
            case SDBLParser.SUBSTRING:
            case SDBLParser.SUM:
            case SDBLParser.TAN:
            case SDBLParser.TENDAYS:
            case SDBLParser.TRIMALL:
            case SDBLParser.TRIML:
            case SDBLParser.TRIMR:
            case SDBLParser.TYPE:
            case SDBLParser.UPPER:
            case SDBLParser.VALUE:
            case SDBLParser.VALUETYPE:
            case SDBLParser.WEEK:
            case SDBLParser.WEEKDAY:
            case SDBLParser.YEAR:
            case SDBLParser.UUID:
            case SDBLParser.ACCOUNTING_REGISTER_TYPE:
            case SDBLParser.ACCUMULATION_REGISTER_TYPE:
            case SDBLParser.BUSINESS_PROCESS_TYPE:
            case SDBLParser.CALCULATION_REGISTER_TYPE:
            case SDBLParser.CATALOG_TYPE:
            case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
            case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
            case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
            case SDBLParser.CONSTANT_TYPE:
            case SDBLParser.DOCUMENT_TYPE:
            case SDBLParser.DOCUMENT_JOURNAL_TYPE:
            case SDBLParser.ENUM_TYPE:
            case SDBLParser.EXCHANGE_PLAN_TYPE:
            case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
            case SDBLParser.FILTER_CRITERION_TYPE:
            case SDBLParser.INFORMATION_REGISTER_TYPE:
            case SDBLParser.SEQUENCE_TYPE:
            case SDBLParser.TASK_TYPE:
            case SDBLParser.ROUTEPOINT_FIELD:
            case SDBLParser.JOIN:
            case SDBLParser.UNION:
            case SDBLParser.IDENTIFIER:
            case SDBLParser.ACTUAL_ACTION_PERIOD_VT:
            case SDBLParser.BALANCE_VT:
            case SDBLParser.BALANCE_AND_TURNOVERS_VT:
            case SDBLParser.BOUNDARIES_VT:
            case SDBLParser.DR_CR_TURNOVERS_VT:
            case SDBLParser.EXT_DIMENSIONS_VT:
            case SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT:
            case SDBLParser.SCHEDULE_DATA_VT:
            case SDBLParser.SLICEFIRST_VT:
            case SDBLParser.SLICELAST_VT:
            case SDBLParser.TASK_BY_PERFORMER_VT:
            case SDBLParser.TURNOVERS_VT:
                {
                this.state = 390;
                this.column();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public indexingSet(): IndexingSetContext {
        let localContext = new IndexingSetContext(this.context, this.state);
        this.enterRule(localContext, 38, SDBLParser.RULE_indexingSet);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 393;
            this.match(SDBLParser.LPAREN);
            this.state = 394;
            localContext._indexingItem = this.indexingItem();
            localContext._indexes.push(localContext._indexingItem!);
            this.state = 399;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 395;
                this.match(SDBLParser.COMMA);
                this.state = 396;
                localContext._indexingItem = this.indexingItem();
                localContext._indexes.push(localContext._indexingItem!);
                }
                }
                this.state = 401;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 402;
            this.match(SDBLParser.RPAREN);
            this.state = 404;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 87) {
                {
                this.state = 403;
                localContext._unique = this.match(SDBLParser.UNIQUE);
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public orderBy(): OrderByContext {
        let localContext = new OrderByContext(this.context, this.state);
        this.enterRule(localContext, 40, SDBLParser.RULE_orderBy);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 406;
            this.match(SDBLParser.ORDER_BY);
            this.state = 407;
            localContext._ordersByExpression = this.ordersByExpression();
            localContext._orders.push(localContext._ordersByExpression!);
            this.state = 412;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 408;
                this.match(SDBLParser.COMMA);
                this.state = 409;
                localContext._ordersByExpression = this.ordersByExpression();
                localContext._orders.push(localContext._ordersByExpression!);
                }
                }
                this.state = 414;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public ordersByExpression(): OrdersByExpressionContext {
        let localContext = new OrdersByExpressionContext(this.context, this.state);
        this.enterRule(localContext, 42, SDBLParser.RULE_ordersByExpression);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 415;
            this.expression(0);
            this.state = 421;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.ASC:
            case SDBLParser.DESC:
                {
                this.state = 416;
                localContext._direction = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(_la === 25 || _la === 31)) {
                    localContext._direction = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                }
                break;
            case SDBLParser.HIERARCHY:
                {
                {
                this.state = 417;
                localContext._hierarchy = this.match(SDBLParser.HIERARCHY);
                this.state = 419;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 31) {
                    {
                    this.state = 418;
                    localContext._direction = this.match(SDBLParser.DESC);
                    }
                }

                }
                }
                break;
            case SDBLParser.EOF:
            case SDBLParser.RPAREN:
            case SDBLParser.SEMICOLON:
            case SDBLParser.COMMA:
            case SDBLParser.AUTOORDER:
            case SDBLParser.TOTALS:
            case SDBLParser.ORDER_BY:
            case SDBLParser.UNION_ALL:
            case SDBLParser.UNION:
                break;
            default:
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public totalBy(): TotalByContext {
        let localContext = new TotalByContext(this.context, this.state);
        this.enterRule(localContext, 44, SDBLParser.RULE_totalBy);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 423;
            this.match(SDBLParser.TOTALS);
            this.state = 425;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1611204112) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4286126613) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 4290772991) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4294967295) !== 0) || ((((_la - 129)) & ~0x1F) === 0 && ((1 << (_la - 129)) & 3263169535) !== 0) || ((((_la - 161)) & ~0x1F) === 0 && ((1 << (_la - 161)) & 2228197) !== 0)) {
                {
                this.state = 424;
                this.selectedFields();
                }
            }

            this.state = 427;
            this.match(SDBLParser.BY);
            this.state = 428;
            localContext._totalsGroup = this.totalsGroup();
            localContext._totalsGroups.push(localContext._totalsGroup!);
            this.state = 433;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 429;
                this.match(SDBLParser.COMMA);
                this.state = 430;
                localContext._totalsGroup = this.totalsGroup();
                localContext._totalsGroups.push(localContext._totalsGroup!);
                }
                }
                this.state = 435;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public totalsGroup(): TotalsGroupContext {
        let localContext = new TotalsGroupContext(this.context, this.state);
        this.enterRule(localContext, 46, SDBLParser.RULE_totalsGroup);
        let _la: number;
        try {
            this.state = 445;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.OVERALL:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 436;
                this.match(SDBLParser.OVERALL);
                }
                break;
            case SDBLParser.LPAREN:
            case SDBLParser.PLUS:
            case SDBLParser.MINUS:
            case SDBLParser.AMPERSAND:
            case SDBLParser.CASE:
            case SDBLParser.CAST:
            case SDBLParser.DROP:
            case SDBLParser.END:
            case SDBLParser.FALSE:
            case SDBLParser.ISNULL:
            case SDBLParser.NULL:
            case SDBLParser.SELECT:
            case SDBLParser.TOTALS:
            case SDBLParser.TRUE:
            case SDBLParser.UNDEFINED:
            case SDBLParser.WHEN:
            case SDBLParser.ACOS:
            case SDBLParser.ASIN:
            case SDBLParser.ATAN:
            case SDBLParser.AVG:
            case SDBLParser.BEGINOFPERIOD:
            case SDBLParser.BOOLEAN:
            case SDBLParser.COS:
            case SDBLParser.COUNT:
            case SDBLParser.DATE:
            case SDBLParser.DATEADD:
            case SDBLParser.DATEDIFF:
            case SDBLParser.DATETIME:
            case SDBLParser.DAY:
            case SDBLParser.DAYOFYEAR:
            case SDBLParser.EMPTYTABLE:
            case SDBLParser.EMPTYREF:
            case SDBLParser.ENDOFPERIOD:
            case SDBLParser.EXP:
            case SDBLParser.HALFYEAR:
            case SDBLParser.HOUR:
            case SDBLParser.INT:
            case SDBLParser.LEFT:
            case SDBLParser.LOG:
            case SDBLParser.LOG10:
            case SDBLParser.LOWER:
            case SDBLParser.MAX:
            case SDBLParser.MIN:
            case SDBLParser.MINUTE:
            case SDBLParser.MONTH:
            case SDBLParser.NUMBER:
            case SDBLParser.QUARTER:
            case SDBLParser.PERIODS:
            case SDBLParser.REFS:
            case SDBLParser.PRESENTATION:
            case SDBLParser.RECORDAUTONUMBER:
            case SDBLParser.REFPRESENTATION:
            case SDBLParser.POW:
            case SDBLParser.RIGHT:
            case SDBLParser.ROUND:
            case SDBLParser.SECOND:
            case SDBLParser.SIN:
            case SDBLParser.SQRT:
            case SDBLParser.STOREDDATASIZE:
            case SDBLParser.STRING:
            case SDBLParser.STRINGLENGTH:
            case SDBLParser.STRFIND:
            case SDBLParser.STRREPLACE:
            case SDBLParser.SUBSTRING:
            case SDBLParser.SUM:
            case SDBLParser.TAN:
            case SDBLParser.TENDAYS:
            case SDBLParser.TRIMALL:
            case SDBLParser.TRIML:
            case SDBLParser.TRIMR:
            case SDBLParser.TYPE:
            case SDBLParser.UPPER:
            case SDBLParser.VALUE:
            case SDBLParser.VALUETYPE:
            case SDBLParser.WEEK:
            case SDBLParser.WEEKDAY:
            case SDBLParser.YEAR:
            case SDBLParser.UUID:
            case SDBLParser.ACCOUNTING_REGISTER_TYPE:
            case SDBLParser.ACCUMULATION_REGISTER_TYPE:
            case SDBLParser.BUSINESS_PROCESS_TYPE:
            case SDBLParser.CALCULATION_REGISTER_TYPE:
            case SDBLParser.CATALOG_TYPE:
            case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
            case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
            case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
            case SDBLParser.CONSTANT_TYPE:
            case SDBLParser.DOCUMENT_TYPE:
            case SDBLParser.DOCUMENT_JOURNAL_TYPE:
            case SDBLParser.ENUM_TYPE:
            case SDBLParser.EXCHANGE_PLAN_TYPE:
            case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
            case SDBLParser.FILTER_CRITERION_TYPE:
            case SDBLParser.INFORMATION_REGISTER_TYPE:
            case SDBLParser.SEQUENCE_TYPE:
            case SDBLParser.TASK_TYPE:
            case SDBLParser.ROUTEPOINT_FIELD:
            case SDBLParser.JOIN:
            case SDBLParser.UNION:
            case SDBLParser.GROUPEDBY:
            case SDBLParser.DECIMAL:
            case SDBLParser.FLOAT:
            case SDBLParser.IDENTIFIER:
            case SDBLParser.ACTUAL_ACTION_PERIOD_VT:
            case SDBLParser.BALANCE_VT:
            case SDBLParser.BALANCE_AND_TURNOVERS_VT:
            case SDBLParser.BOUNDARIES_VT:
            case SDBLParser.DR_CR_TURNOVERS_VT:
            case SDBLParser.EXT_DIMENSIONS_VT:
            case SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT:
            case SDBLParser.SCHEDULE_DATA_VT:
            case SDBLParser.SLICEFIRST_VT:
            case SDBLParser.SLICELAST_VT:
            case SDBLParser.TASK_BY_PERFORMER_VT:
            case SDBLParser.TURNOVERS_VT:
            case SDBLParser.STR:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 437;
                this.expression(0);
                this.state = 440;
                this.errorHandler.sync(this);
                switch (this.interpreter.adaptivePredict(this.tokenStream, 43, this.context) ) {
                case 1:
                    {
                    this.state = 438;
                    localContext._hierarchyType = this.tokenStream.LT(1);
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 155 || _la === 156)) {
                        localContext._hierarchyType = this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                    break;
                case 2:
                    {
                    this.state = 439;
                    this.periodic();
                    }
                    break;
                }
                this.state = 443;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (((((_la - 24)) & ~0x1F) === 0 && ((1 << (_la - 24)) & 302254593) !== 0) || ((((_la - 57)) & ~0x1F) === 0 && ((1 << (_la - 57)) & 3221225471) !== 0) || ((((_la - 89)) & ~0x1F) === 0 && ((1 << (_la - 89)) & 4294967295) !== 0) || ((((_la - 121)) & ~0x1F) === 0 && ((1 << (_la - 121)) & 2147745791) !== 0) || ((((_la - 154)) & ~0x1F) === 0 && ((1 << (_la - 154)) & 16773633) !== 0)) {
                    {
                    this.state = 442;
                    this.alias();
                    }
                }

                }
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public periodic(): PeriodicContext {
        let localContext = new PeriodicContext(this.context, this.state);
        this.enterRule(localContext, 48, SDBLParser.RULE_periodic);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 447;
            this.match(SDBLParser.PERIODS);
            this.state = 448;
            this.match(SDBLParser.LPAREN);
            this.state = 449;
            localContext._periodType = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 269058241) !== 0) || ((((_la - 108)) & ~0x1F) === 0 && ((1 << (_la - 108)) & 1281) !== 0))) {
                localContext._periodType = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 452;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 46, this.context) ) {
            case 1:
                {
                this.state = 450;
                this.match(SDBLParser.COMMA);
                this.state = 451;
                localContext._first = this.expression(0);
                }
                break;
            }
            this.state = 456;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 7) {
                {
                this.state = 454;
                this.match(SDBLParser.COMMA);
                this.state = 455;
                localContext._second = this.expression(0);
                }
            }

            this.state = 458;
            this.match(SDBLParser.RPAREN);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public column(): ColumnContext {
        let localContext = new ColumnContext(this.context, this.state);
        this.enterRule(localContext, 50, SDBLParser.RULE_column);
        try {
            let alternative: number;
            this.state = 475;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 50, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 460;
                localContext._mdoName = this.identifier();
                this.state = 463;
                this.errorHandler.sync(this);
                alternative = 1;
                do {
                    switch (alternative) {
                    case 1:
                        {
                        {
                        this.state = 461;
                        this.match(SDBLParser.DOT);
                        this.state = 462;
                        localContext._identifier = this.identifier();
                        localContext._columnNames.push(localContext._identifier!);
                        }
                        }
                        break;
                    default:
                        throw new antlr.NoViableAltException(this);
                    }
                    this.state = 465;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 48, this.context);
                } while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 467;
                localContext._identifier = this.identifier();
                localContext._columnNames.push(localContext._identifier!);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 468;
                this.mdo();
                this.state = 471;
                this.errorHandler.sync(this);
                alternative = 1;
                do {
                    switch (alternative) {
                    case 1:
                        {
                        {
                        this.state = 469;
                        this.match(SDBLParser.DOT);
                        this.state = 470;
                        localContext._identifier = this.identifier();
                        localContext._columnNames.push(localContext._identifier!);
                        }
                        }
                        break;
                    default:
                        throw new antlr.NoViableAltException(this);
                    }
                    this.state = 473;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 49, this.context);
                } while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER);
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public expression(): ExpressionContext;
    public expression(_p: number): ExpressionContext;
    public expression(_p?: number): ExpressionContext {
        if (_p === undefined) {
            _p = 0;
        }

        let parentContext = this.context;
        let parentState = this.state;
        let localContext = new ExpressionContext(this.context, parentState);
        let previousContext = localContext;
        let _startState = 52;
        this.enterRecursionRule(localContext, 52, SDBLParser.RULE_expression, _p);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 484;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 51, this.context) ) {
            case 1:
                {
                this.state = 478;
                this.primitiveExpression();
                }
                break;
            case 2:
                {
                this.state = 479;
                this.functionCall();
                }
                break;
            case 3:
                {
                this.state = 480;
                this.caseExpression();
                }
                break;
            case 4:
                {
                this.state = 481;
                this.column();
                }
                break;
            case 5:
                {
                this.state = 482;
                this.bracketExpression();
                }
                break;
            case 6:
                {
                this.state = 483;
                this.unaryExpression();
                }
                break;
            }
            this.context!.stop = this.tokenStream.LT(-1);
            this.state = 491;
            this.errorHandler.sync(this);
            alternative = this.interpreter.adaptivePredict(this.tokenStream, 52, this.context);
            while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                if (alternative === 1) {
                    if (this.parseListeners != null) {
                        this.triggerExitRuleEvent();
                    }
                    previousContext = localContext;
                    {
                    {
                    localContext = new ExpressionContext(parentContext, parentState);
                    this.pushNewRecursionContext(localContext, _startState, SDBLParser.RULE_expression);
                    this.state = 486;
                    if (!(this.precpred(this.context, 1))) {
                        throw this.createFailedPredicateException("this.precpred(this.context, 1)");
                    }
                    this.state = 487;
                    localContext._binaryOperation = this.tokenStream.LT(1);
                    _la = this.tokenStream.LA(1);
                    if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 198144) !== 0))) {
                        localContext._binaryOperation = this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    this.state = 488;
                    this.expression(2);
                    }
                    }
                }
                this.state = 493;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 52, this.context);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.unrollRecursionContexts(parentContext);
        }
        return localContext;
    }
    public primitiveExpression(): PrimitiveExpressionContext {
        let localContext = new PrimitiveExpressionContext(this.context, this.state);
        this.enterRule(localContext, 54, SDBLParser.RULE_primitiveExpression);
        let _la: number;
        try {
            this.state = 529;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.NULL:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 494;
                this.match(SDBLParser.NULL);
                }
                break;
            case SDBLParser.UNDEFINED:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 495;
                this.match(SDBLParser.UNDEFINED);
                }
                break;
            case SDBLParser.STR:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 496;
                this.multiString();
                }
                break;
            case SDBLParser.DECIMAL:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 497;
                this.match(SDBLParser.DECIMAL);
                }
                break;
            case SDBLParser.FLOAT:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 498;
                this.match(SDBLParser.FLOAT);
                }
                break;
            case SDBLParser.FALSE:
            case SDBLParser.TRUE:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 499;
                localContext._booleanValue = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(_la === 37 || _la === 53)) {
                    localContext._booleanValue = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                }
                break;
            case SDBLParser.DATETIME:
                this.enterOuterAlt(localContext, 7);
                {
                {
                this.state = 500;
                this.match(SDBLParser.DATETIME);
                this.state = 501;
                this.match(SDBLParser.LPAREN);
                this.state = 502;
                localContext._year = this.datePart();
                this.state = 503;
                this.match(SDBLParser.COMMA);
                this.state = 504;
                localContext._month = this.datePart();
                this.state = 505;
                this.match(SDBLParser.COMMA);
                this.state = 506;
                localContext._day = this.datePart();
                this.state = 514;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 7) {
                    {
                    this.state = 507;
                    this.match(SDBLParser.COMMA);
                    this.state = 508;
                    localContext._hour = this.datePart();
                    this.state = 509;
                    this.match(SDBLParser.COMMA);
                    this.state = 510;
                    localContext._minute = this.datePart();
                    this.state = 511;
                    this.match(SDBLParser.COMMA);
                    this.state = 512;
                    localContext._second = this.datePart();
                    }
                }

                this.state = 516;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.AMPERSAND:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 518;
                this.parameter();
                }
                break;
            case SDBLParser.TYPE:
                this.enterOuterAlt(localContext, 9);
                {
                {
                this.state = 519;
                this.match(SDBLParser.TYPE);
                this.state = 520;
                this.match(SDBLParser.LPAREN);
                this.state = 526;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case SDBLParser.ACCOUNTING_REGISTER_TYPE:
                case SDBLParser.ACCUMULATION_REGISTER_TYPE:
                case SDBLParser.BUSINESS_PROCESS_TYPE:
                case SDBLParser.CALCULATION_REGISTER_TYPE:
                case SDBLParser.CATALOG_TYPE:
                case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
                case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
                case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
                case SDBLParser.CONSTANT_TYPE:
                case SDBLParser.DOCUMENT_TYPE:
                case SDBLParser.DOCUMENT_JOURNAL_TYPE:
                case SDBLParser.ENUM_TYPE:
                case SDBLParser.EXCHANGE_PLAN_TYPE:
                case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
                case SDBLParser.FILTER_CRITERION_TYPE:
                case SDBLParser.INFORMATION_REGISTER_TYPE:
                case SDBLParser.SEQUENCE_TYPE:
                case SDBLParser.TASK_TYPE:
                    {
                    this.state = 521;
                    this.mdo();
                    }
                    break;
                case SDBLParser.STRING:
                    {
                    this.state = 522;
                    this.match(SDBLParser.STRING);
                    }
                    break;
                case SDBLParser.BOOLEAN:
                    {
                    this.state = 523;
                    this.match(SDBLParser.BOOLEAN);
                    }
                    break;
                case SDBLParser.DATE:
                    {
                    this.state = 524;
                    this.match(SDBLParser.DATE);
                    }
                    break;
                case SDBLParser.NUMBER:
                    {
                    this.state = 525;
                    this.match(SDBLParser.NUMBER);
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                this.state = 528;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public caseExpression(): CaseExpressionContext {
        let localContext = new CaseExpressionContext(this.context, this.state);
        this.enterRule(localContext, 56, SDBLParser.RULE_caseExpression);
        let _la: number;
        try {
            this.state = 563;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 61, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 531;
                this.match(SDBLParser.CASE);
                this.state = 532;
                localContext._caseExp = this.expression(0);
                this.state = 534;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                do {
                    {
                    {
                    this.state = 533;
                    this.caseBranch();
                    }
                    }
                    this.state = 536;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                } while (_la === 55);
                this.state = 540;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 34) {
                    {
                    this.state = 538;
                    this.match(SDBLParser.ELSE);
                    this.state = 539;
                    localContext._elseExp = this.logicalExpression();
                    }
                }

                this.state = 542;
                this.match(SDBLParser.END);
                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 544;
                this.match(SDBLParser.CASE);
                this.state = 546;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                do {
                    {
                    {
                    this.state = 545;
                    this.caseBranch();
                    }
                    }
                    this.state = 548;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                } while (_la === 55);
                this.state = 552;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 34) {
                    {
                    this.state = 550;
                    this.match(SDBLParser.ELSE);
                    this.state = 551;
                    localContext._elseExp = this.logicalExpression();
                    }
                }

                this.state = 554;
                this.match(SDBLParser.END);
                }
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                {
                this.state = 556;
                this.caseBranch();
                this.state = 559;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 34) {
                    {
                    this.state = 557;
                    this.match(SDBLParser.ELSE);
                    this.state = 558;
                    localContext._elseExp = this.logicalExpression();
                    }
                }

                this.state = 561;
                this.match(SDBLParser.END);
                }
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public caseBranch(): CaseBranchContext {
        let localContext = new CaseBranchContext(this.context, this.state);
        this.enterRule(localContext, 58, SDBLParser.RULE_caseBranch);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 565;
            this.match(SDBLParser.WHEN);
            this.state = 566;
            this.logicalExpression();
            this.state = 567;
            this.match(SDBLParser.THEN);
            this.state = 568;
            this.logicalExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public bracketExpression(): BracketExpressionContext {
        let localContext = new BracketExpressionContext(this.context, this.state);
        this.enterRule(localContext, 60, SDBLParser.RULE_bracketExpression);
        try {
            this.state = 578;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 62, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 570;
                this.match(SDBLParser.LPAREN);
                this.state = 571;
                this.expression(0);
                this.state = 572;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 574;
                this.match(SDBLParser.LPAREN);
                this.state = 575;
                this.subquery();
                this.state = 576;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public unaryExpression(): UnaryExpressionContext {
        let localContext = new UnaryExpressionContext(this.context, this.state);
        this.enterRule(localContext, 62, SDBLParser.RULE_unaryExpression);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 580;
            this.sign();
            this.state = 581;
            this.expression(0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public functionCall(): FunctionCallContext {
        let localContext = new FunctionCallContext(this.context, this.state);
        this.enterRule(localContext, 64, SDBLParser.RULE_functionCall);
        try {
            let alternative: number;
            this.state = 601;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.AVG:
            case SDBLParser.COUNT:
            case SDBLParser.MAX:
            case SDBLParser.MIN:
            case SDBLParser.SUM:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 583;
                this.aggregateFunctions();
                }
                break;
            case SDBLParser.ISNULL:
            case SDBLParser.ACOS:
            case SDBLParser.ASIN:
            case SDBLParser.ATAN:
            case SDBLParser.BEGINOFPERIOD:
            case SDBLParser.COS:
            case SDBLParser.DATEADD:
            case SDBLParser.DATEDIFF:
            case SDBLParser.DAY:
            case SDBLParser.DAYOFYEAR:
            case SDBLParser.ENDOFPERIOD:
            case SDBLParser.EXP:
            case SDBLParser.HOUR:
            case SDBLParser.INT:
            case SDBLParser.LEFT:
            case SDBLParser.LOG:
            case SDBLParser.LOG10:
            case SDBLParser.LOWER:
            case SDBLParser.MINUTE:
            case SDBLParser.MONTH:
            case SDBLParser.QUARTER:
            case SDBLParser.PRESENTATION:
            case SDBLParser.REFPRESENTATION:
            case SDBLParser.POW:
            case SDBLParser.RIGHT:
            case SDBLParser.ROUND:
            case SDBLParser.SECOND:
            case SDBLParser.SIN:
            case SDBLParser.SQRT:
            case SDBLParser.STOREDDATASIZE:
            case SDBLParser.STRING:
            case SDBLParser.STRINGLENGTH:
            case SDBLParser.STRFIND:
            case SDBLParser.STRREPLACE:
            case SDBLParser.SUBSTRING:
            case SDBLParser.TAN:
            case SDBLParser.TRIMALL:
            case SDBLParser.TRIML:
            case SDBLParser.TRIMR:
            case SDBLParser.UPPER:
            case SDBLParser.VALUETYPE:
            case SDBLParser.WEEK:
            case SDBLParser.WEEKDAY:
            case SDBLParser.YEAR:
            case SDBLParser.UUID:
            case SDBLParser.GROUPEDBY:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 584;
                this.builtInFunctions();
                }
                break;
            case SDBLParser.VALUE:
                this.enterOuterAlt(localContext, 3);
                {
                {
                this.state = 585;
                this.valueFunction();
                this.state = 590;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 63, this.context);
                while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                    if (alternative === 1) {
                        {
                        {
                        this.state = 586;
                        this.match(SDBLParser.DOT);
                        this.state = 587;
                        localContext._identifier = this.identifier();
                        localContext._columnNames.push(localContext._identifier!);
                        }
                        }
                    }
                    this.state = 592;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 63, this.context);
                }
                }
                }
                break;
            case SDBLParser.CAST:
                this.enterOuterAlt(localContext, 4);
                {
                {
                this.state = 593;
                this.castFunction();
                this.state = 598;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 64, this.context);
                while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                    if (alternative === 1) {
                        {
                        {
                        this.state = 594;
                        this.match(SDBLParser.DOT);
                        this.state = 595;
                        localContext._identifier = this.identifier();
                        localContext._columnNames.push(localContext._identifier!);
                        }
                        }
                    }
                    this.state = 600;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 64, this.context);
                }
                }
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public builtInFunctions(): BuiltInFunctionsContext {
        let localContext = new BuiltInFunctionsContext(this.context, this.state);
        this.enterRule(localContext, 66, SDBLParser.RULE_builtInFunctions);
        let _la: number;
        try {
            this.state = 699;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.SUBSTRING:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 603;
                localContext._doCall = this.match(SDBLParser.SUBSTRING);
                this.state = 604;
                this.match(SDBLParser.LPAREN);
                this.state = 605;
                localContext._string_ = this.expression(0);
                this.state = 606;
                this.match(SDBLParser.COMMA);
                this.state = 607;
                localContext._charNo = this.expression(0);
                this.state = 608;
                this.match(SDBLParser.COMMA);
                this.state = 609;
                localContext._count = this.expression(0);
                this.state = 610;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.DAY:
            case SDBLParser.DAYOFYEAR:
            case SDBLParser.HOUR:
            case SDBLParser.MINUTE:
            case SDBLParser.MONTH:
            case SDBLParser.QUARTER:
            case SDBLParser.SECOND:
            case SDBLParser.WEEK:
            case SDBLParser.WEEKDAY:
            case SDBLParser.YEAR:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 612;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 269058179) !== 0) || ((((_la - 116)) & ~0x1F) === 0 && ((1 << (_la - 116)) & 7) !== 0))) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 613;
                this.match(SDBLParser.LPAREN);
                this.state = 614;
                localContext._date = this.expression(0);
                this.state = 615;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.BEGINOFPERIOD:
            case SDBLParser.ENDOFPERIOD:
                this.enterOuterAlt(localContext, 3);
                {
                {
                this.state = 617;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(_la === 61 || _la === 73)) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 618;
                this.match(SDBLParser.LPAREN);
                this.state = 619;
                localContext._date = this.expression(0);
                this.state = 620;
                this.match(SDBLParser.COMMA);
                this.state = 621;
                localContext._periodType = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 622785) !== 0) || ((((_la - 108)) & ~0x1F) === 0 && ((1 << (_la - 108)) & 1281) !== 0))) {
                    localContext._periodType = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 622;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.DATEADD:
                this.enterOuterAlt(localContext, 4);
                {
                {
                this.state = 624;
                localContext._doCall = this.match(SDBLParser.DATEADD);
                this.state = 625;
                this.match(SDBLParser.LPAREN);
                this.state = 626;
                localContext._date = this.expression(0);
                this.state = 627;
                this.match(SDBLParser.COMMA);
                this.state = 628;
                localContext._periodType = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 269058241) !== 0) || ((((_la - 108)) & ~0x1F) === 0 && ((1 << (_la - 108)) & 1281) !== 0))) {
                    localContext._periodType = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 629;
                this.match(SDBLParser.COMMA);
                this.state = 630;
                localContext._count = this.expression(0);
                this.state = 631;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.DATEDIFF:
                this.enterOuterAlt(localContext, 5);
                {
                {
                this.state = 633;
                localContext._doCall = this.match(SDBLParser.DATEDIFF);
                this.state = 634;
                this.match(SDBLParser.LPAREN);
                this.state = 635;
                localContext._firstdate = this.expression(0);
                this.state = 636;
                this.match(SDBLParser.COMMA);
                this.state = 637;
                localContext._seconddate = this.expression(0);
                this.state = 638;
                this.match(SDBLParser.COMMA);
                this.state = 639;
                localContext._periodType = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 69)) & ~0x1F) === 0 && ((1 << (_la - 69)) & 269058177) !== 0) || _la === 118)) {
                    localContext._periodType = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 640;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.PRESENTATION:
            case SDBLParser.REFPRESENTATION:
            case SDBLParser.STRING:
            case SDBLParser.VALUETYPE:
            case SDBLParser.GROUPEDBY:
                this.enterOuterAlt(localContext, 6);
                {
                {
                this.state = 642;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 91)) & ~0x1F) === 0 && ((1 << (_la - 91)) & 16778245) !== 0) || _la === 159)) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 643;
                this.match(SDBLParser.LPAREN);
                this.state = 644;
                localContext._value = this.expression(0);
                this.state = 645;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.ISNULL:
                this.enterOuterAlt(localContext, 7);
                {
                {
                this.state = 647;
                localContext._doCall = this.match(SDBLParser.ISNULL);
                this.state = 648;
                this.match(SDBLParser.LPAREN);
                this.state = 649;
                localContext._first = this.logicalExpression();
                this.state = 650;
                this.match(SDBLParser.COMMA);
                this.state = 651;
                localContext._second = this.logicalExpression();
                this.state = 652;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.ACOS:
            case SDBLParser.ASIN:
            case SDBLParser.ATAN:
            case SDBLParser.COS:
            case SDBLParser.EXP:
            case SDBLParser.INT:
            case SDBLParser.LOG:
            case SDBLParser.LOG10:
            case SDBLParser.POW:
            case SDBLParser.SIN:
            case SDBLParser.SQRT:
            case SDBLParser.TAN:
                this.enterOuterAlt(localContext, 8);
                {
                {
                this.state = 654;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 57)) & ~0x1F) === 0 && ((1 << (_la - 57)) & 13762631) !== 0) || ((((_la - 94)) & ~0x1F) === 0 && ((1 << (_la - 94)) & 8241) !== 0))) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 655;
                this.match(SDBLParser.LPAREN);
                this.state = 656;
                localContext._decimal = this.expression(0);
                this.state = 657;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.LOWER:
            case SDBLParser.STRINGLENGTH:
            case SDBLParser.TRIMALL:
            case SDBLParser.TRIML:
            case SDBLParser.TRIMR:
            case SDBLParser.UPPER:
                this.enterOuterAlt(localContext, 9);
                {
                {
                this.state = 659;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 81)) & ~0x1F) === 0 && ((1 << (_la - 81)) & 1881145345) !== 0) || _la === 113)) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 660;
                this.match(SDBLParser.LPAREN);
                this.state = 661;
                localContext._string_ = this.expression(0);
                this.state = 662;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.LEFT:
            case SDBLParser.RIGHT:
                this.enterOuterAlt(localContext, 10);
                {
                {
                this.state = 664;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(_la === 78 || _la === 95)) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 665;
                this.match(SDBLParser.LPAREN);
                this.state = 666;
                localContext._string_ = this.expression(0);
                this.state = 667;
                this.match(SDBLParser.COMMA);
                this.state = 668;
                localContext._stringLength = this.expression(0);
                this.state = 669;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.ROUND:
                this.enterOuterAlt(localContext, 11);
                {
                {
                this.state = 671;
                localContext._doCall = this.match(SDBLParser.ROUND);
                this.state = 672;
                this.match(SDBLParser.LPAREN);
                this.state = 673;
                localContext._decimal = this.expression(0);
                this.state = 674;
                this.match(SDBLParser.COMMA);
                this.state = 675;
                localContext._precise = this.expression(0);
                this.state = 676;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.STOREDDATASIZE:
            case SDBLParser.UUID:
                this.enterOuterAlt(localContext, 12);
                {
                {
                this.state = 678;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(_la === 100 || _la === 119)) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 679;
                this.match(SDBLParser.LPAREN);
                this.state = 680;
                localContext._value = this.expression(0);
                this.state = 681;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.STRFIND:
                this.enterOuterAlt(localContext, 13);
                {
                {
                this.state = 683;
                localContext._doCall = this.match(SDBLParser.STRFIND);
                this.state = 684;
                this.match(SDBLParser.LPAREN);
                this.state = 685;
                localContext._string_ = this.expression(0);
                this.state = 686;
                this.match(SDBLParser.COMMA);
                this.state = 687;
                localContext._substring1 = this.expression(0);
                this.state = 688;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.STRREPLACE:
                this.enterOuterAlt(localContext, 14);
                {
                {
                this.state = 690;
                localContext._doCall = this.match(SDBLParser.STRREPLACE);
                this.state = 691;
                this.match(SDBLParser.LPAREN);
                this.state = 692;
                localContext._string_ = this.expression(0);
                this.state = 693;
                this.match(SDBLParser.COMMA);
                this.state = 694;
                localContext._substring1 = this.expression(0);
                this.state = 695;
                this.match(SDBLParser.COMMA);
                this.state = 696;
                localContext._substring2 = this.expression(0);
                this.state = 697;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public aggregateFunctions(): AggregateFunctionsContext {
        let localContext = new AggregateFunctionsContext(this.context, this.state);
        this.enterRule(localContext, 68, SDBLParser.RULE_aggregateFunctions);
        let _la: number;
        try {
            this.state = 716;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.AVG:
            case SDBLParser.MAX:
            case SDBLParser.MIN:
            case SDBLParser.SUM:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 701;
                localContext._doCall = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 60)) & ~0x1F) === 0 && ((1 << (_la - 60)) & 12582913) !== 0) || _la === 106)) {
                    localContext._doCall = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 702;
                this.match(SDBLParser.LPAREN);
                this.state = 703;
                this.logicalExpression();
                this.state = 704;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case SDBLParser.COUNT:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 706;
                localContext._doCall = this.match(SDBLParser.COUNT);
                this.state = 707;
                this.match(SDBLParser.LPAREN);
                this.state = 713;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case SDBLParser.LPAREN:
                case SDBLParser.PLUS:
                case SDBLParser.MINUS:
                case SDBLParser.AMPERSAND:
                case SDBLParser.CASE:
                case SDBLParser.CAST:
                case SDBLParser.DISTINCT:
                case SDBLParser.DROP:
                case SDBLParser.END:
                case SDBLParser.FALSE:
                case SDBLParser.ISNULL:
                case SDBLParser.NOT:
                case SDBLParser.NULL:
                case SDBLParser.SELECT:
                case SDBLParser.TOTALS:
                case SDBLParser.TRUE:
                case SDBLParser.UNDEFINED:
                case SDBLParser.WHEN:
                case SDBLParser.ACOS:
                case SDBLParser.ASIN:
                case SDBLParser.ATAN:
                case SDBLParser.AVG:
                case SDBLParser.BEGINOFPERIOD:
                case SDBLParser.BOOLEAN:
                case SDBLParser.COS:
                case SDBLParser.COUNT:
                case SDBLParser.DATE:
                case SDBLParser.DATEADD:
                case SDBLParser.DATEDIFF:
                case SDBLParser.DATETIME:
                case SDBLParser.DAY:
                case SDBLParser.DAYOFYEAR:
                case SDBLParser.EMPTYTABLE:
                case SDBLParser.EMPTYREF:
                case SDBLParser.ENDOFPERIOD:
                case SDBLParser.EXP:
                case SDBLParser.HALFYEAR:
                case SDBLParser.HOUR:
                case SDBLParser.INT:
                case SDBLParser.LEFT:
                case SDBLParser.LOG:
                case SDBLParser.LOG10:
                case SDBLParser.LOWER:
                case SDBLParser.MAX:
                case SDBLParser.MIN:
                case SDBLParser.MINUTE:
                case SDBLParser.MONTH:
                case SDBLParser.NUMBER:
                case SDBLParser.QUARTER:
                case SDBLParser.PERIODS:
                case SDBLParser.REFS:
                case SDBLParser.PRESENTATION:
                case SDBLParser.RECORDAUTONUMBER:
                case SDBLParser.REFPRESENTATION:
                case SDBLParser.POW:
                case SDBLParser.RIGHT:
                case SDBLParser.ROUND:
                case SDBLParser.SECOND:
                case SDBLParser.SIN:
                case SDBLParser.SQRT:
                case SDBLParser.STOREDDATASIZE:
                case SDBLParser.STRING:
                case SDBLParser.STRINGLENGTH:
                case SDBLParser.STRFIND:
                case SDBLParser.STRREPLACE:
                case SDBLParser.SUBSTRING:
                case SDBLParser.SUM:
                case SDBLParser.TAN:
                case SDBLParser.TENDAYS:
                case SDBLParser.TRIMALL:
                case SDBLParser.TRIML:
                case SDBLParser.TRIMR:
                case SDBLParser.TYPE:
                case SDBLParser.UPPER:
                case SDBLParser.VALUE:
                case SDBLParser.VALUETYPE:
                case SDBLParser.WEEK:
                case SDBLParser.WEEKDAY:
                case SDBLParser.YEAR:
                case SDBLParser.UUID:
                case SDBLParser.ACCOUNTING_REGISTER_TYPE:
                case SDBLParser.ACCUMULATION_REGISTER_TYPE:
                case SDBLParser.BUSINESS_PROCESS_TYPE:
                case SDBLParser.CALCULATION_REGISTER_TYPE:
                case SDBLParser.CATALOG_TYPE:
                case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
                case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
                case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
                case SDBLParser.CONSTANT_TYPE:
                case SDBLParser.DOCUMENT_TYPE:
                case SDBLParser.DOCUMENT_JOURNAL_TYPE:
                case SDBLParser.ENUM_TYPE:
                case SDBLParser.EXCHANGE_PLAN_TYPE:
                case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
                case SDBLParser.FILTER_CRITERION_TYPE:
                case SDBLParser.INFORMATION_REGISTER_TYPE:
                case SDBLParser.SEQUENCE_TYPE:
                case SDBLParser.TASK_TYPE:
                case SDBLParser.ROUTEPOINT_FIELD:
                case SDBLParser.JOIN:
                case SDBLParser.UNION:
                case SDBLParser.GROUPEDBY:
                case SDBLParser.DECIMAL:
                case SDBLParser.FLOAT:
                case SDBLParser.IDENTIFIER:
                case SDBLParser.ACTUAL_ACTION_PERIOD_VT:
                case SDBLParser.BALANCE_VT:
                case SDBLParser.BALANCE_AND_TURNOVERS_VT:
                case SDBLParser.BOUNDARIES_VT:
                case SDBLParser.DR_CR_TURNOVERS_VT:
                case SDBLParser.EXT_DIMENSIONS_VT:
                case SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT:
                case SDBLParser.SCHEDULE_DATA_VT:
                case SDBLParser.SLICEFIRST_VT:
                case SDBLParser.SLICELAST_VT:
                case SDBLParser.TASK_BY_PERFORMER_VT:
                case SDBLParser.TURNOVERS_VT:
                case SDBLParser.STR:
                    {
                    this.state = 709;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                    if (_la === 32) {
                        {
                        this.state = 708;
                        this.match(SDBLParser.DISTINCT);
                        }
                    }

                    this.state = 711;
                    this.logicalExpression();
                    }
                    break;
                case SDBLParser.MUL:
                    {
                    this.state = 712;
                    this.match(SDBLParser.MUL);
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                this.state = 715;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public valueFunction(): ValueFunctionContext {
        let localContext = new ValueFunctionContext(this.context, this.state);
        this.enterRule(localContext, 70, SDBLParser.RULE_valueFunction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 718;
            localContext._doCall = this.match(SDBLParser.VALUE);
            this.state = 719;
            this.match(SDBLParser.LPAREN);
            this.state = 747;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 70, this.context) ) {
            case 1:
                {
                {
                this.state = 720;
                localContext._type_ = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 122)) & ~0x1F) === 0 && ((1 << (_la - 122)) & 40637) !== 0))) {
                    localContext._type_ = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 721;
                this.match(SDBLParser.DOT);
                this.state = 722;
                localContext._mdoName = this.identifier();
                this.state = 723;
                this.match(SDBLParser.DOT);
                this.state = 724;
                localContext._emptyFer = this.match(SDBLParser.EMPTYREF);
                }
                }
                break;
            case 2:
                {
                {
                this.state = 726;
                localContext._type_ = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 124)) & ~0x1F) === 0 && ((1 << (_la - 124)) & 143) !== 0))) {
                    localContext._type_ = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 727;
                this.match(SDBLParser.DOT);
                this.state = 728;
                localContext._mdoName = this.identifier();
                this.state = 729;
                this.match(SDBLParser.DOT);
                this.state = 730;
                localContext._predefinedName = this.identifier();
                }
                }
                break;
            case 3:
                {
                {
                this.state = 732;
                localContext._type_ = this.match(SDBLParser.BUSINESS_PROCESS_TYPE);
                this.state = 733;
                this.match(SDBLParser.DOT);
                this.state = 734;
                localContext._mdoName = this.identifier();
                this.state = 735;
                this.match(SDBLParser.DOT);
                this.state = 736;
                this.match(SDBLParser.ROUTEPOINT_FIELD);
                this.state = 737;
                this.match(SDBLParser.DOT);
                this.state = 738;
                localContext._routePointName = this.identifier();
                }
                }
                break;
            case 4:
                {
                {
                this.state = 740;
                localContext._systemName = this.identifier();
                this.state = 741;
                this.match(SDBLParser.DOT);
                this.state = 742;
                localContext._predefinedName = this.identifier();
                }
                }
                break;
            case 5:
                {
                {
                this.state = 744;
                this.mdo();
                this.state = 745;
                this.match(SDBLParser.DOT);
                }
                }
                break;
            }
            this.state = 749;
            this.match(SDBLParser.RPAREN);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public castFunction(): CastFunctionContext {
        let localContext = new CastFunctionContext(this.context, this.state);
        this.enterRule(localContext, 72, SDBLParser.RULE_castFunction);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            {
            this.state = 751;
            localContext._doCall = this.match(SDBLParser.CAST);
            this.state = 752;
            this.match(SDBLParser.LPAREN);
            this.state = 753;
            localContext._value = this.expression(0);
            this.state = 754;
            this.match(SDBLParser.AS);
            this.state = 774;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.BOOLEAN:
                {
                this.state = 755;
                localContext._type_ = this.match(SDBLParser.BOOLEAN);
                }
                break;
            case SDBLParser.NUMBER:
                {
                {
                this.state = 756;
                localContext._type_ = this.match(SDBLParser.NUMBER);
                this.state = 764;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 4) {
                    {
                    this.state = 757;
                    this.match(SDBLParser.LPAREN);
                    this.state = 758;
                    localContext._len = this.match(SDBLParser.DECIMAL);
                    this.state = 761;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                    if (_la === 7) {
                        {
                        this.state = 759;
                        this.match(SDBLParser.COMMA);
                        this.state = 760;
                        localContext._prec = this.match(SDBLParser.DECIMAL);
                        }
                    }

                    this.state = 763;
                    this.match(SDBLParser.RPAREN);
                    }
                }

                }
                }
                break;
            case SDBLParser.STRING:
                {
                {
                this.state = 766;
                localContext._type_ = this.match(SDBLParser.STRING);
                this.state = 770;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 4) {
                    {
                    this.state = 767;
                    this.match(SDBLParser.LPAREN);
                    this.state = 768;
                    localContext._len = this.match(SDBLParser.DECIMAL);
                    this.state = 769;
                    this.match(SDBLParser.RPAREN);
                    }
                }

                }
                }
                break;
            case SDBLParser.DATE:
                {
                this.state = 772;
                localContext._type_ = this.match(SDBLParser.DATE);
                }
                break;
            case SDBLParser.ACCOUNTING_REGISTER_TYPE:
            case SDBLParser.ACCUMULATION_REGISTER_TYPE:
            case SDBLParser.BUSINESS_PROCESS_TYPE:
            case SDBLParser.CALCULATION_REGISTER_TYPE:
            case SDBLParser.CATALOG_TYPE:
            case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
            case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
            case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
            case SDBLParser.CONSTANT_TYPE:
            case SDBLParser.DOCUMENT_TYPE:
            case SDBLParser.DOCUMENT_JOURNAL_TYPE:
            case SDBLParser.ENUM_TYPE:
            case SDBLParser.EXCHANGE_PLAN_TYPE:
            case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
            case SDBLParser.FILTER_CRITERION_TYPE:
            case SDBLParser.INFORMATION_REGISTER_TYPE:
            case SDBLParser.SEQUENCE_TYPE:
            case SDBLParser.TASK_TYPE:
                {
                this.state = 773;
                this.mdo();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.state = 776;
            this.match(SDBLParser.RPAREN);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public logicalExpression(): LogicalExpressionContext {
        let localContext = new LogicalExpressionContext(this.context, this.state);
        this.enterRule(localContext, 74, SDBLParser.RULE_logicalExpression);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 778;
            localContext._predicate = this.predicate();
            localContext._condidions.push(localContext._predicate!);
            this.state = 783;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 23 || _la === 47) {
                {
                {
                this.state = 779;
                _la = this.tokenStream.LA(1);
                if(!(_la === 23 || _la === 47)) {
                this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 780;
                localContext._predicate = this.predicate();
                localContext._condidions.push(localContext._predicate!);
                }
                }
                this.state = 785;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public predicate(): PredicateContext {
        let localContext = new PredicateContext(this.context, this.state);
        this.enterRule(localContext, 76, SDBLParser.RULE_predicate);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 789;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 44) {
                {
                {
                this.state = 786;
                this.match(SDBLParser.NOT);
                }
                }
                this.state = 791;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 803;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 77, this.context) ) {
            case 1:
                {
                this.state = 792;
                localContext._booleanPredicate = this.expression(0);
                }
                break;
            case 2:
                {
                this.state = 793;
                this.likePredicate();
                }
                break;
            case 3:
                {
                this.state = 794;
                this.isNullPredicate();
                }
                break;
            case 4:
                {
                this.state = 795;
                this.comparePredicate();
                }
                break;
            case 5:
                {
                this.state = 796;
                this.betweenPredicate();
                }
                break;
            case 6:
                {
                this.state = 797;
                this.inPredicate();
                }
                break;
            case 7:
                {
                this.state = 798;
                this.refsPredicate();
                }
                break;
            case 8:
                {
                {
                this.state = 799;
                this.match(SDBLParser.LPAREN);
                this.state = 800;
                this.logicalExpression();
                this.state = 801;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public likePredicate(): LikePredicateContext {
        let localContext = new LikePredicateContext(this.context, this.state);
        this.enterRule(localContext, 78, SDBLParser.RULE_likePredicate);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 805;
            this.expression(0);
            this.state = 809;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 44) {
                {
                {
                this.state = 806;
                this.match(SDBLParser.NOT);
                }
                }
                this.state = 811;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 812;
            this.match(SDBLParser.LIKE);
            this.state = 813;
            this.expression(0);
            this.state = 816;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 36) {
                {
                this.state = 814;
                this.match(SDBLParser.ESCAPE);
                this.state = 815;
                localContext._escape = this.multiString();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public isNullPredicate(): IsNullPredicateContext {
        let localContext = new IsNullPredicateContext(this.context, this.state);
        this.enterRule(localContext, 80, SDBLParser.RULE_isNullPredicate);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 818;
            this.expression(0);
            this.state = 819;
            this.match(SDBLParser.IS);
            this.state = 821;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 44) {
                {
                this.state = 820;
                this.match(SDBLParser.NOT);
                }
            }

            this.state = 823;
            this.match(SDBLParser.NULL);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public comparePredicate(): ComparePredicateContext {
        let localContext = new ComparePredicateContext(this.context, this.state);
        this.enterRule(localContext, 82, SDBLParser.RULE_comparePredicate);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 825;
            this.expression(0);
            this.state = 826;
            localContext._compareOperation = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 63744) !== 0))) {
                localContext._compareOperation = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 827;
            this.expression(0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public betweenPredicate(): BetweenPredicateContext {
        let localContext = new BetweenPredicateContext(this.context, this.state);
        this.enterRule(localContext, 84, SDBLParser.RULE_betweenPredicate);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 829;
            this.expression(0);
            this.state = 830;
            this.match(SDBLParser.BETWEEN);
            this.state = 831;
            this.expression(0);
            this.state = 832;
            this.match(SDBLParser.AND);
            this.state = 833;
            this.expression(0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public inPredicate(): InPredicateContext {
        let localContext = new InPredicateContext(this.context, this.state);
        this.enterRule(localContext, 86, SDBLParser.RULE_inPredicate);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 840;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 81, this.context) ) {
            case 1:
                {
                this.state = 835;
                this.expression(0);
                }
                break;
            case 2:
                {
                {
                this.state = 836;
                this.match(SDBLParser.LPAREN);
                this.state = 837;
                this.expressionList();
                this.state = 838;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            }
            this.state = 845;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 44) {
                {
                {
                this.state = 842;
                this.match(SDBLParser.NOT);
                }
                }
                this.state = 847;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 848;
            localContext._typeIn = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(_la === 157 || _la === 158)) {
                localContext._typeIn = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 849;
            this.match(SDBLParser.LPAREN);
            this.state = 852;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 83, this.context) ) {
            case 1:
                {
                this.state = 850;
                this.subquery();
                }
                break;
            case 2:
                {
                this.state = 851;
                this.expressionList();
                }
                break;
            }
            this.state = 854;
            this.match(SDBLParser.RPAREN);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public refsPredicate(): RefsPredicateContext {
        let localContext = new RefsPredicateContext(this.context, this.state);
        this.enterRule(localContext, 88, SDBLParser.RULE_refsPredicate);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 856;
            this.expression(0);
            this.state = 857;
            this.match(SDBLParser.REFS);
            this.state = 858;
            this.mdo();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public expressionList(): ExpressionListContext {
        let localContext = new ExpressionListContext(this.context, this.state);
        this.enterRule(localContext, 90, SDBLParser.RULE_expressionList);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 860;
            localContext._expressionListItem = this.expressionListItem();
            localContext._exp.push(localContext._expressionListItem!);
            this.state = 865;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 861;
                this.match(SDBLParser.COMMA);
                this.state = 862;
                localContext._expressionListItem = this.expressionListItem();
                localContext._exp.push(localContext._expressionListItem!);
                }
                }
                this.state = 867;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public expressionListItem(): ExpressionListItemContext {
        let localContext = new ExpressionListItemContext(this.context, this.state);
        this.enterRule(localContext, 92, SDBLParser.RULE_expressionListItem);
        try {
            this.state = 870;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 85, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 868;
                this.expression(0);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 869;
                this.logicalExpression();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public dataSources(): DataSourcesContext {
        let localContext = new DataSourcesContext(this.context, this.state);
        this.enterRule(localContext, 94, SDBLParser.RULE_dataSources);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 872;
            localContext._dataSource = this.dataSource();
            localContext._tables.push(localContext._dataSource!);
            this.state = 877;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 7) {
                {
                {
                this.state = 873;
                this.match(SDBLParser.COMMA);
                this.state = 874;
                localContext._dataSource = this.dataSource();
                localContext._tables.push(localContext._dataSource!);
                }
                }
                this.state = 879;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public dataSource(): DataSourceContext {
        let localContext = new DataSourceContext(this.context, this.state);
        this.enterRule(localContext, 96, SDBLParser.RULE_dataSource);
        let _la: number;
        try {
            this.state = 912;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 93, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 880;
                this.match(SDBLParser.LPAREN);
                this.state = 881;
                this.dataSource();
                this.state = 882;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 904;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case SDBLParser.AMPERSAND:
                case SDBLParser.DROP:
                case SDBLParser.END:
                case SDBLParser.ISNULL:
                case SDBLParser.SELECT:
                case SDBLParser.TOTALS:
                case SDBLParser.ACOS:
                case SDBLParser.ASIN:
                case SDBLParser.ATAN:
                case SDBLParser.AVG:
                case SDBLParser.BEGINOFPERIOD:
                case SDBLParser.BOOLEAN:
                case SDBLParser.COS:
                case SDBLParser.COUNT:
                case SDBLParser.DATE:
                case SDBLParser.DATEADD:
                case SDBLParser.DATEDIFF:
                case SDBLParser.DATETIME:
                case SDBLParser.DAY:
                case SDBLParser.DAYOFYEAR:
                case SDBLParser.EMPTYTABLE:
                case SDBLParser.EMPTYREF:
                case SDBLParser.ENDOFPERIOD:
                case SDBLParser.EXP:
                case SDBLParser.HALFYEAR:
                case SDBLParser.HOUR:
                case SDBLParser.INT:
                case SDBLParser.LEFT:
                case SDBLParser.LOG:
                case SDBLParser.LOG10:
                case SDBLParser.LOWER:
                case SDBLParser.MAX:
                case SDBLParser.MIN:
                case SDBLParser.MINUTE:
                case SDBLParser.MONTH:
                case SDBLParser.NUMBER:
                case SDBLParser.QUARTER:
                case SDBLParser.PERIODS:
                case SDBLParser.REFS:
                case SDBLParser.PRESENTATION:
                case SDBLParser.RECORDAUTONUMBER:
                case SDBLParser.REFPRESENTATION:
                case SDBLParser.POW:
                case SDBLParser.RIGHT:
                case SDBLParser.ROUND:
                case SDBLParser.SECOND:
                case SDBLParser.SIN:
                case SDBLParser.SQRT:
                case SDBLParser.STOREDDATASIZE:
                case SDBLParser.STRING:
                case SDBLParser.STRINGLENGTH:
                case SDBLParser.STRFIND:
                case SDBLParser.STRREPLACE:
                case SDBLParser.SUBSTRING:
                case SDBLParser.SUM:
                case SDBLParser.TAN:
                case SDBLParser.TENDAYS:
                case SDBLParser.TRIMALL:
                case SDBLParser.TRIML:
                case SDBLParser.TRIMR:
                case SDBLParser.TYPE:
                case SDBLParser.UPPER:
                case SDBLParser.VALUE:
                case SDBLParser.VALUETYPE:
                case SDBLParser.WEEK:
                case SDBLParser.WEEKDAY:
                case SDBLParser.YEAR:
                case SDBLParser.UUID:
                case SDBLParser.ACCOUNTING_REGISTER_TYPE:
                case SDBLParser.ACCUMULATION_REGISTER_TYPE:
                case SDBLParser.BUSINESS_PROCESS_TYPE:
                case SDBLParser.CALCULATION_REGISTER_TYPE:
                case SDBLParser.CATALOG_TYPE:
                case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
                case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
                case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
                case SDBLParser.CONSTANT_TYPE:
                case SDBLParser.DOCUMENT_TYPE:
                case SDBLParser.DOCUMENT_JOURNAL_TYPE:
                case SDBLParser.ENUM_TYPE:
                case SDBLParser.EXCHANGE_PLAN_TYPE:
                case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
                case SDBLParser.FILTER_CRITERION_TYPE:
                case SDBLParser.INFORMATION_REGISTER_TYPE:
                case SDBLParser.SEQUENCE_TYPE:
                case SDBLParser.TASK_TYPE:
                case SDBLParser.ROUTEPOINT_FIELD:
                case SDBLParser.JOIN:
                case SDBLParser.UNION:
                case SDBLParser.IDENTIFIER:
                case SDBLParser.ACTUAL_ACTION_PERIOD_VT:
                case SDBLParser.BALANCE_VT:
                case SDBLParser.BALANCE_AND_TURNOVERS_VT:
                case SDBLParser.BOUNDARIES_VT:
                case SDBLParser.DR_CR_TURNOVERS_VT:
                case SDBLParser.EXT_DIMENSIONS_VT:
                case SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT:
                case SDBLParser.SCHEDULE_DATA_VT:
                case SDBLParser.SLICEFIRST_VT:
                case SDBLParser.SLICELAST_VT:
                case SDBLParser.TASK_BY_PERFORMER_VT:
                case SDBLParser.TURNOVERS_VT:
                    {
                    {
                    this.state = 888;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 87, this.context) ) {
                    case 1:
                        {
                        this.state = 884;
                        this.virtualTable();
                        }
                        break;
                    case 2:
                        {
                        this.state = 885;
                        this.table();
                        }
                        break;
                    case 3:
                        {
                        this.state = 886;
                        this.parameterTable();
                        }
                        break;
                    case 4:
                        {
                        this.state = 887;
                        this.externalDataSourceTable();
                        }
                        break;
                    }
                    this.state = 891;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 88, this.context) ) {
                    case 1:
                        {
                        this.state = 890;
                        this.alias();
                        }
                        break;
                    }
                    }
                    }
                    break;
                case SDBLParser.LPAREN:
                    {
                    {
                    this.state = 893;
                    this.match(SDBLParser.LPAREN);
                    this.state = 898;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 89, this.context) ) {
                    case 1:
                        {
                        this.state = 894;
                        this.virtualTable();
                        }
                        break;
                    case 2:
                        {
                        this.state = 895;
                        this.table();
                        }
                        break;
                    case 3:
                        {
                        this.state = 896;
                        this.parameterTable();
                        }
                        break;
                    case 4:
                        {
                        this.state = 897;
                        this.subquery();
                        }
                        break;
                    }
                    this.state = 900;
                    this.match(SDBLParser.RPAREN);
                    this.state = 902;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 90, this.context) ) {
                    case 1:
                        {
                        this.state = 901;
                        this.alias();
                        }
                        break;
                    }
                    }
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                this.state = 909;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (((((_la - 145)) & ~0x1F) === 0 && ((1 << (_la - 145)) & 255) !== 0)) {
                    {
                    {
                    this.state = 906;
                    localContext._joinPart = this.joinPart();
                    localContext._joins.push(localContext._joinPart!);
                    }
                    }
                    this.state = 911;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public table(): TableContext {
        let localContext = new TableContext(this.context, this.state);
        this.enterRule(localContext, 98, SDBLParser.RULE_table);
        try {
            this.state = 920;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 94, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 914;
                this.mdo();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 915;
                this.mdo();
                this.state = 916;
                this.match(SDBLParser.DOT);
                this.state = 917;
                localContext._objectTableName = this.identifier();
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 919;
                localContext._tableName = this.identifier();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public virtualTable(): VirtualTableContext {
        let localContext = new VirtualTableContext(this.context, this.state);
        this.enterRule(localContext, 100, SDBLParser.RULE_virtualTable);
        let _la: number;
        try {
            this.state = 947;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 98, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                {
                this.state = 922;
                this.mdo();
                this.state = 923;
                this.match(SDBLParser.DOT);
                this.state = 924;
                localContext._virtualTableName = this.tokenStream.LT(1);
                _la = this.tokenStream.LA(1);
                if(!(((((_la - 166)) & ~0x1F) === 0 && ((1 << (_la - 166)) & 4095) !== 0))) {
                    localContext._virtualTableName = this.errorHandler.recoverInline(this);
                }
                else {
                    this.errorHandler.reportMatch(this);
                    this.consume();
                }
                this.state = 936;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 4) {
                    {
                    this.state = 925;
                    this.match(SDBLParser.LPAREN);
                    this.state = 926;
                    localContext._virtualTableParameter = this.virtualTableParameter();
                    localContext._virtualTableParameters.push(localContext._virtualTableParameter!);
                    this.state = 931;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                    while (_la === 7) {
                        {
                        {
                        this.state = 927;
                        this.match(SDBLParser.COMMA);
                        this.state = 928;
                        localContext._virtualTableParameter = this.virtualTableParameter();
                        localContext._virtualTableParameters.push(localContext._virtualTableParameter!);
                        }
                        }
                        this.state = 933;
                        this.errorHandler.sync(this);
                        _la = this.tokenStream.LA(1);
                    }
                    this.state = 934;
                    this.match(SDBLParser.RPAREN);
                    }
                }

                }
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                {
                this.state = 938;
                localContext._type_ = this.match(SDBLParser.FILTER_CRITERION_TYPE);
                this.state = 939;
                this.match(SDBLParser.DOT);
                this.state = 940;
                localContext._tableName = this.identifier();
                this.state = 941;
                this.match(SDBLParser.LPAREN);
                this.state = 943;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 19) {
                    {
                    this.state = 942;
                    this.parameter();
                    }
                }

                this.state = 945;
                this.match(SDBLParser.RPAREN);
                }
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public virtualTableParameter(): VirtualTableParameterContext {
        let localContext = new VirtualTableParameterContext(this.context, this.state);
        this.enterRule(localContext, 102, SDBLParser.RULE_virtualTableParameter);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 950;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1611138576) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4286126613) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 4290772991) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4294967295) !== 0) || ((((_la - 129)) & ~0x1F) === 0 && ((1 << (_la - 129)) & 3263169535) !== 0) || ((((_la - 161)) & ~0x1F) === 0 && ((1 << (_la - 161)) & 2228197) !== 0)) {
                {
                this.state = 949;
                this.logicalExpression();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public parameterTable(): ParameterTableContext {
        let localContext = new ParameterTableContext(this.context, this.state);
        this.enterRule(localContext, 104, SDBLParser.RULE_parameterTable);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 952;
            this.parameter();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public externalDataSourceTable(): ExternalDataSourceTableContext {
        let localContext = new ExternalDataSourceTableContext(this.context, this.state);
        this.enterRule(localContext, 106, SDBLParser.RULE_externalDataSourceTable);
        try {
            this.state = 970;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 100, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 954;
                this.mdo();
                this.state = 955;
                this.match(SDBLParser.DOT);
                this.state = 956;
                this.match(SDBLParser.EDS_TABLE);
                this.state = 957;
                this.match(SDBLParser.DOT);
                this.state = 958;
                localContext._tableName = this.identifier();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 960;
                this.mdo();
                this.state = 961;
                this.match(SDBLParser.DOT);
                this.state = 962;
                this.match(SDBLParser.EDS_CUBE);
                this.state = 963;
                this.match(SDBLParser.DOT);
                this.state = 964;
                localContext._cubeName = this.identifier();
                this.state = 965;
                this.match(SDBLParser.DOT);
                this.state = 966;
                this.match(SDBLParser.EDS_CUBE_DIMTABLE);
                this.state = 967;
                this.match(SDBLParser.DOT);
                this.state = 968;
                localContext._tableName = this.identifier();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public joinPart(): JoinPartContext {
        let localContext = new JoinPartContext(this.context, this.state);
        this.enterRule(localContext, 108, SDBLParser.RULE_joinPart);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 976;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.RIGHT_OUTER_JOIN:
            case SDBLParser.RIGHT_JOIN:
                {
                this.state = 972;
                this.rightJoin();
                }
                break;
            case SDBLParser.LEFT_OUTER_JOIN:
            case SDBLParser.LEFT_JOIN:
                {
                this.state = 973;
                this.leftJoin();
                }
                break;
            case SDBLParser.FULL_OUTER_JOIN:
            case SDBLParser.FULL_JOIN:
                {
                this.state = 974;
                this.fullJoin();
                }
                break;
            case SDBLParser.INNER_JOIN:
            case SDBLParser.JOIN:
                {
                this.state = 975;
                this.innerJoin();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.state = 978;
            localContext._source = this.dataSource();
            this.state = 979;
            this.match(SDBLParser.BY);
            this.state = 980;
            localContext._condition = this.logicalExpression();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public rightJoin(): RightJoinContext {
        let localContext = new RightJoinContext(this.context, this.state);
        this.enterRule(localContext, 110, SDBLParser.RULE_rightJoin);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 982;
            localContext._keyword = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(_la === 145 || _la === 146)) {
                localContext._keyword = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public leftJoin(): LeftJoinContext {
        let localContext = new LeftJoinContext(this.context, this.state);
        this.enterRule(localContext, 112, SDBLParser.RULE_leftJoin);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 984;
            localContext._keyword = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(_la === 147 || _la === 148)) {
                localContext._keyword = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fullJoin(): FullJoinContext {
        let localContext = new FullJoinContext(this.context, this.state);
        this.enterRule(localContext, 114, SDBLParser.RULE_fullJoin);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 986;
            localContext._keyword = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(_la === 149 || _la === 150)) {
                localContext._keyword = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public innerJoin(): InnerJoinContext {
        let localContext = new InnerJoinContext(this.context, this.state);
        this.enterRule(localContext, 116, SDBLParser.RULE_innerJoin);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 988;
            localContext._keyword = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(_la === 151 || _la === 152)) {
                localContext._keyword = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public alias(): AliasContext {
        let localContext = new AliasContext(this.context, this.state);
        this.enterRule(localContext, 118, SDBLParser.RULE_alias);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 991;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 24) {
                {
                this.state = 990;
                this.match(SDBLParser.AS);
                }
            }

            this.state = 993;
            localContext._name = this.identifier();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public datePart(): DatePartContext {
        let localContext = new DatePartContext(this.context, this.state);
        this.enterRule(localContext, 120, SDBLParser.RULE_datePart);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 997;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case SDBLParser.AMPERSAND:
                {
                this.state = 995;
                this.parameter();
                }
                break;
            case SDBLParser.DECIMAL:
                {
                this.state = 996;
                this.match(SDBLParser.DECIMAL);
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public multiString(): MultiStringContext {
        let localContext = new MultiStringContext(this.context, this.state);
        this.enterRule(localContext, 122, SDBLParser.RULE_multiString);
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1000;
            this.errorHandler.sync(this);
            alternative = 1;
            do {
                switch (alternative) {
                case 1:
                    {
                    {
                    this.state = 999;
                    this.match(SDBLParser.STR);
                    }
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                this.state = 1002;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 104, this.context);
            } while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public sign(): SignContext {
        let localContext = new SignContext(this.context, this.state);
        this.enterRule(localContext, 124, SDBLParser.RULE_sign);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1004;
            _la = this.tokenStream.LA(1);
            if(!(_la === 9 || _la === 10)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public identifier(): IdentifierContext {
        let localContext = new IdentifierContext(this.context, this.state);
        this.enterRule(localContext, 126, SDBLParser.RULE_identifier);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1006;
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 4278780421) !== 0) || ((((_la - 65)) & ~0x1F) === 0 && ((1 << (_la - 65)) & 4290772991) !== 0) || ((((_la - 97)) & ~0x1F) === 0 && ((1 << (_la - 97)) & 4294967295) !== 0) || ((((_la - 129)) & ~0x1F) === 0 && ((1 << (_la - 129)) & 41944063) !== 0) || ((((_la - 163)) & ~0x1F) === 0 && ((1 << (_la - 163)) & 32761) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public temporaryTableIdentifier(): TemporaryTableIdentifierContext {
        let localContext = new TemporaryTableIdentifierContext(this.context, this.state);
        this.enterRule(localContext, 128, SDBLParser.RULE_temporaryTableIdentifier);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1009;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 3) {
                {
                this.state = 1008;
                this.match(SDBLParser.DOT);
                }
            }

            this.state = 1033;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 111, this.context) ) {
            case 1:
                {
                this.state = 1012;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                do {
                    {
                    {
                    this.state = 1011;
                    this.match(SDBLParser.NUMBER_SIGH);
                    }
                    }
                    this.state = 1014;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                } while (_la === 18);
                }
                break;
            case 2:
                {
                this.state = 1016;
                this.identifier();
                }
                break;
            case 3:
                {
                this.state = 1029;
                this.errorHandler.sync(this);
                alternative = 1;
                do {
                    switch (alternative) {
                    case 1:
                        {
                        {
                        this.state = 1019;
                        this.errorHandler.sync(this);
                        alternative = 1;
                        do {
                            switch (alternative) {
                            case 1:
                                {
                                this.state = 1019;
                                this.errorHandler.sync(this);
                                switch (this.tokenStream.LA(1)) {
                                case SDBLParser.DROP:
                                case SDBLParser.END:
                                case SDBLParser.ISNULL:
                                case SDBLParser.SELECT:
                                case SDBLParser.TOTALS:
                                case SDBLParser.ACOS:
                                case SDBLParser.ASIN:
                                case SDBLParser.ATAN:
                                case SDBLParser.AVG:
                                case SDBLParser.BEGINOFPERIOD:
                                case SDBLParser.BOOLEAN:
                                case SDBLParser.COS:
                                case SDBLParser.COUNT:
                                case SDBLParser.DATE:
                                case SDBLParser.DATEADD:
                                case SDBLParser.DATEDIFF:
                                case SDBLParser.DATETIME:
                                case SDBLParser.DAY:
                                case SDBLParser.DAYOFYEAR:
                                case SDBLParser.EMPTYTABLE:
                                case SDBLParser.EMPTYREF:
                                case SDBLParser.ENDOFPERIOD:
                                case SDBLParser.EXP:
                                case SDBLParser.HALFYEAR:
                                case SDBLParser.HOUR:
                                case SDBLParser.INT:
                                case SDBLParser.LEFT:
                                case SDBLParser.LOG:
                                case SDBLParser.LOG10:
                                case SDBLParser.LOWER:
                                case SDBLParser.MAX:
                                case SDBLParser.MIN:
                                case SDBLParser.MINUTE:
                                case SDBLParser.MONTH:
                                case SDBLParser.NUMBER:
                                case SDBLParser.QUARTER:
                                case SDBLParser.PERIODS:
                                case SDBLParser.REFS:
                                case SDBLParser.PRESENTATION:
                                case SDBLParser.RECORDAUTONUMBER:
                                case SDBLParser.REFPRESENTATION:
                                case SDBLParser.POW:
                                case SDBLParser.RIGHT:
                                case SDBLParser.ROUND:
                                case SDBLParser.SECOND:
                                case SDBLParser.SIN:
                                case SDBLParser.SQRT:
                                case SDBLParser.STOREDDATASIZE:
                                case SDBLParser.STRING:
                                case SDBLParser.STRINGLENGTH:
                                case SDBLParser.STRFIND:
                                case SDBLParser.STRREPLACE:
                                case SDBLParser.SUBSTRING:
                                case SDBLParser.SUM:
                                case SDBLParser.TAN:
                                case SDBLParser.TENDAYS:
                                case SDBLParser.TRIMALL:
                                case SDBLParser.TRIML:
                                case SDBLParser.TRIMR:
                                case SDBLParser.TYPE:
                                case SDBLParser.UPPER:
                                case SDBLParser.VALUE:
                                case SDBLParser.VALUETYPE:
                                case SDBLParser.WEEK:
                                case SDBLParser.WEEKDAY:
                                case SDBLParser.YEAR:
                                case SDBLParser.UUID:
                                case SDBLParser.ACCOUNTING_REGISTER_TYPE:
                                case SDBLParser.ACCUMULATION_REGISTER_TYPE:
                                case SDBLParser.BUSINESS_PROCESS_TYPE:
                                case SDBLParser.CALCULATION_REGISTER_TYPE:
                                case SDBLParser.CATALOG_TYPE:
                                case SDBLParser.CHART_OF_ACCOUNTS_TYPE:
                                case SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE:
                                case SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE:
                                case SDBLParser.CONSTANT_TYPE:
                                case SDBLParser.DOCUMENT_TYPE:
                                case SDBLParser.DOCUMENT_JOURNAL_TYPE:
                                case SDBLParser.ENUM_TYPE:
                                case SDBLParser.EXCHANGE_PLAN_TYPE:
                                case SDBLParser.EXTERNAL_DATA_SOURCE_TYPE:
                                case SDBLParser.FILTER_CRITERION_TYPE:
                                case SDBLParser.INFORMATION_REGISTER_TYPE:
                                case SDBLParser.SEQUENCE_TYPE:
                                case SDBLParser.TASK_TYPE:
                                case SDBLParser.ROUTEPOINT_FIELD:
                                case SDBLParser.JOIN:
                                case SDBLParser.UNION:
                                case SDBLParser.IDENTIFIER:
                                case SDBLParser.ACTUAL_ACTION_PERIOD_VT:
                                case SDBLParser.BALANCE_VT:
                                case SDBLParser.BALANCE_AND_TURNOVERS_VT:
                                case SDBLParser.BOUNDARIES_VT:
                                case SDBLParser.DR_CR_TURNOVERS_VT:
                                case SDBLParser.EXT_DIMENSIONS_VT:
                                case SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT:
                                case SDBLParser.SCHEDULE_DATA_VT:
                                case SDBLParser.SLICEFIRST_VT:
                                case SDBLParser.SLICELAST_VT:
                                case SDBLParser.TASK_BY_PERFORMER_VT:
                                case SDBLParser.TURNOVERS_VT:
                                    {
                                    this.state = 1017;
                                    this.identifier();
                                    }
                                    break;
                                case SDBLParser.NUMBER_SIGH:
                                    {
                                    this.state = 1018;
                                    this.match(SDBLParser.NUMBER_SIGH);
                                    }
                                    break;
                                default:
                                    throw new antlr.NoViableAltException(this);
                                }
                                }
                                break;
                            default:
                                throw new antlr.NoViableAltException(this);
                            }
                            this.state = 1021;
                            this.errorHandler.sync(this);
                            alternative = this.interpreter.adaptivePredict(this.tokenStream, 108, this.context);
                        } while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER);
                        this.state = 1026;
                        this.errorHandler.sync(this);
                        _la = this.tokenStream.LA(1);
                        while (_la === 160) {
                            {
                            {
                            this.state = 1023;
                            this.match(SDBLParser.DECIMAL);
                            }
                            }
                            this.state = 1028;
                            this.errorHandler.sync(this);
                            _la = this.tokenStream.LA(1);
                        }
                        }
                        }
                        break;
                    default:
                        throw new antlr.NoViableAltException(this);
                    }
                    this.state = 1031;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 110, this.context);
                } while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER);
                }
                break;
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public parameter(): ParameterContext {
        let localContext = new ParameterContext(this.context, this.state);
        this.enterRule(localContext, 130, SDBLParser.RULE_parameter);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1035;
            this.match(SDBLParser.AMPERSAND);
            this.state = 1036;
            localContext._name = this.match(SDBLParser.PARAMETER_IDENTIFIER);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public mdo(): MdoContext {
        let localContext = new MdoContext(this.context, this.state);
        this.enterRule(localContext, 132, SDBLParser.RULE_mdo);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 1038;
            localContext._type_ = this.tokenStream.LT(1);
            _la = this.tokenStream.LA(1);
            if(!(((((_la - 120)) & ~0x1F) === 0 && ((1 << (_la - 120)) & 262143) !== 0))) {
                localContext._type_ = this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 1039;
            this.match(SDBLParser.DOT);
            this.state = 1040;
            localContext._tableName = this.identifier();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public override sempred(localContext: antlr.ParserRuleContext | null, ruleIndex: number, predIndex: number): boolean {
        switch (ruleIndex) {
        case 26:
            return this.expression_sempred(localContext as ExpressionContext, predIndex);
        }
        return true;
    }
    private expression_sempred(localContext: ExpressionContext | null, predIndex: number): boolean {
        switch (predIndex) {
        case 0:
            return this.precpred(this.context, 1);
        }
        return true;
    }

    public static readonly _serializedATN: number[] = [
        4,1,182,1043,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,
        7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,
        13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,
        20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,2,26,7,
        26,2,27,7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,31,2,32,7,32,2,
        33,7,33,2,34,7,34,2,35,7,35,2,36,7,36,2,37,7,37,2,38,7,38,2,39,7,
        39,2,40,7,40,2,41,7,41,2,42,7,42,2,43,7,43,2,44,7,44,2,45,7,45,2,
        46,7,46,2,47,7,47,2,48,7,48,2,49,7,49,2,50,7,50,2,51,7,51,2,52,7,
        52,2,53,7,53,2,54,7,54,2,55,7,55,2,56,7,56,2,57,7,57,2,58,7,58,2,
        59,7,59,2,60,7,60,2,61,7,61,2,62,7,62,2,63,7,63,2,64,7,64,2,65,7,
        65,2,66,7,66,1,0,1,0,1,0,5,0,138,8,0,10,0,12,0,141,9,0,1,0,3,0,144,
        8,0,1,0,1,0,1,1,1,1,3,1,150,8,1,1,2,1,2,1,2,1,3,1,3,1,3,1,3,1,3,
        1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,3,3,171,8,3,1,3,1,3,
        1,3,3,3,176,8,3,1,3,1,3,3,3,180,8,3,3,3,182,8,3,1,4,1,4,3,4,186,
        8,4,1,4,4,4,189,8,4,11,4,12,4,190,3,4,193,8,4,1,5,1,5,1,5,3,5,198,
        8,5,1,6,1,6,3,6,202,8,6,1,6,1,6,1,6,3,6,207,8,6,1,6,1,6,3,6,211,
        8,6,1,6,1,6,3,6,215,8,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,
        5,6,227,8,6,10,6,12,6,230,9,6,1,6,1,6,1,6,1,6,1,6,1,6,5,6,238,8,
        6,10,6,12,6,241,9,6,3,6,243,8,6,1,6,1,6,3,6,247,8,6,1,6,1,6,3,6,
        251,8,6,3,6,253,8,6,1,6,1,6,1,6,1,6,1,6,5,6,260,8,6,10,6,12,6,263,
        9,6,1,6,1,6,1,6,1,6,1,6,3,6,270,8,6,1,6,1,6,1,6,3,6,275,8,6,5,6,
        277,8,6,10,6,12,6,280,9,6,3,6,282,8,6,1,7,1,7,1,7,3,7,287,8,7,1,
        7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,
        7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,7,1,
        7,1,7,1,7,1,7,3,7,325,8,7,1,8,1,8,1,8,1,9,1,9,1,9,5,9,333,8,9,10,
        9,12,9,336,9,9,1,10,1,10,1,10,1,10,1,10,3,10,343,8,10,1,10,3,10,
        346,8,10,1,11,1,11,1,11,5,11,351,8,11,10,11,12,11,354,9,11,1,11,
        1,11,1,12,1,12,3,12,360,8,12,1,13,1,13,3,13,364,8,13,1,14,1,14,1,
        14,1,14,1,14,1,14,1,15,1,15,1,15,5,15,375,8,15,10,15,12,15,378,9,
        15,1,16,1,16,1,16,1,16,1,16,1,16,1,17,1,17,1,17,1,17,1,18,1,18,3,
        18,392,8,18,1,19,1,19,1,19,1,19,5,19,398,8,19,10,19,12,19,401,9,
        19,1,19,1,19,3,19,405,8,19,1,20,1,20,1,20,1,20,5,20,411,8,20,10,
        20,12,20,414,9,20,1,21,1,21,1,21,1,21,3,21,420,8,21,3,21,422,8,21,
        1,22,1,22,3,22,426,8,22,1,22,1,22,1,22,1,22,5,22,432,8,22,10,22,
        12,22,435,9,22,1,23,1,23,1,23,1,23,3,23,441,8,23,1,23,3,23,444,8,
        23,3,23,446,8,23,1,24,1,24,1,24,1,24,1,24,3,24,453,8,24,1,24,1,24,
        3,24,457,8,24,1,24,1,24,1,25,1,25,1,25,4,25,464,8,25,11,25,12,25,
        465,1,25,1,25,1,25,1,25,4,25,472,8,25,11,25,12,25,473,3,25,476,8,
        25,1,26,1,26,1,26,1,26,1,26,1,26,1,26,3,26,485,8,26,1,26,1,26,1,
        26,5,26,490,8,26,10,26,12,26,493,9,26,1,27,1,27,1,27,1,27,1,27,1,
        27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,
        27,1,27,3,27,515,8,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,27,1,
        27,1,27,3,27,527,8,27,1,27,3,27,530,8,27,1,28,1,28,1,28,4,28,535,
        8,28,11,28,12,28,536,1,28,1,28,3,28,541,8,28,1,28,1,28,1,28,1,28,
        4,28,547,8,28,11,28,12,28,548,1,28,1,28,3,28,553,8,28,1,28,1,28,
        1,28,1,28,1,28,3,28,560,8,28,1,28,1,28,3,28,564,8,28,1,29,1,29,1,
        29,1,29,1,29,1,30,1,30,1,30,1,30,1,30,1,30,1,30,1,30,3,30,579,8,
        30,1,31,1,31,1,31,1,32,1,32,1,32,1,32,1,32,5,32,589,8,32,10,32,12,
        32,592,9,32,1,32,1,32,1,32,5,32,597,8,32,10,32,12,32,600,9,32,3,
        32,602,8,32,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,1,
        33,1,33,1,33,1,33,1,33,1,33,1,33,1,33,3,33,700,8,33,1,34,1,34,1,
        34,1,34,1,34,1,34,1,34,1,34,3,34,710,8,34,1,34,1,34,3,34,714,8,34,
        1,34,3,34,717,8,34,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,
        1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,1,35,
        1,35,1,35,1,35,1,35,1,35,1,35,1,35,3,35,748,8,35,1,35,1,35,1,36,
        1,36,1,36,1,36,1,36,1,36,1,36,1,36,1,36,1,36,3,36,762,8,36,1,36,
        3,36,765,8,36,1,36,1,36,1,36,1,36,3,36,771,8,36,1,36,1,36,3,36,775,
        8,36,1,36,1,36,1,37,1,37,1,37,5,37,782,8,37,10,37,12,37,785,9,37,
        1,38,5,38,788,8,38,10,38,12,38,791,9,38,1,38,1,38,1,38,1,38,1,38,
        1,38,1,38,1,38,1,38,1,38,1,38,3,38,804,8,38,1,39,1,39,5,39,808,8,
        39,10,39,12,39,811,9,39,1,39,1,39,1,39,1,39,3,39,817,8,39,1,40,1,
        40,1,40,3,40,822,8,40,1,40,1,40,1,41,1,41,1,41,1,41,1,42,1,42,1,
        42,1,42,1,42,1,42,1,43,1,43,1,43,1,43,1,43,3,43,841,8,43,1,43,5,
        43,844,8,43,10,43,12,43,847,9,43,1,43,1,43,1,43,1,43,3,43,853,8,
        43,1,43,1,43,1,44,1,44,1,44,1,44,1,45,1,45,1,45,5,45,864,8,45,10,
        45,12,45,867,9,45,1,46,1,46,3,46,871,8,46,1,47,1,47,1,47,5,47,876,
        8,47,10,47,12,47,879,9,47,1,48,1,48,1,48,1,48,1,48,1,48,1,48,1,48,
        3,48,889,8,48,1,48,3,48,892,8,48,1,48,1,48,1,48,1,48,1,48,3,48,899,
        8,48,1,48,1,48,3,48,903,8,48,3,48,905,8,48,1,48,5,48,908,8,48,10,
        48,12,48,911,9,48,3,48,913,8,48,1,49,1,49,1,49,1,49,1,49,1,49,3,
        49,921,8,49,1,50,1,50,1,50,1,50,1,50,1,50,1,50,5,50,930,8,50,10,
        50,12,50,933,9,50,1,50,1,50,3,50,937,8,50,1,50,1,50,1,50,1,50,1,
        50,3,50,944,8,50,1,50,1,50,3,50,948,8,50,1,51,3,51,951,8,51,1,52,
        1,52,1,53,1,53,1,53,1,53,1,53,1,53,1,53,1,53,1,53,1,53,1,53,1,53,
        1,53,1,53,1,53,1,53,3,53,971,8,53,1,54,1,54,1,54,1,54,3,54,977,8,
        54,1,54,1,54,1,54,1,54,1,55,1,55,1,56,1,56,1,57,1,57,1,58,1,58,1,
        59,3,59,992,8,59,1,59,1,59,1,60,1,60,3,60,998,8,60,1,61,4,61,1001,
        8,61,11,61,12,61,1002,1,62,1,62,1,63,1,63,1,64,3,64,1010,8,64,1,
        64,4,64,1013,8,64,11,64,12,64,1014,1,64,1,64,1,64,4,64,1020,8,64,
        11,64,12,64,1021,1,64,5,64,1025,8,64,10,64,12,64,1028,9,64,4,64,
        1030,8,64,11,64,12,64,1031,3,64,1034,8,64,1,65,1,65,1,65,1,66,1,
        66,1,66,1,66,1,66,0,1,52,67,0,2,4,6,8,10,12,14,16,18,20,22,24,26,
        28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,60,62,64,66,68,70,
        72,74,76,78,80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,
        112,114,116,118,120,122,124,126,128,130,132,0,30,1,0,153,154,2,0,
        22,22,40,40,2,0,25,25,31,31,1,0,155,156,8,0,69,69,75,76,84,85,88,
        88,97,97,108,108,116,116,118,118,2,0,9,10,16,17,2,0,37,37,53,53,
        6,0,69,70,76,76,84,85,88,88,97,97,116,118,2,0,61,61,73,73,7,0,69,
        69,75,76,84,85,88,88,108,108,116,116,118,118,6,0,69,69,76,76,84,
        85,88,88,97,97,118,118,5,0,91,91,93,93,101,101,115,115,159,159,8,
        0,57,59,63,63,74,74,77,77,79,80,94,94,98,99,107,107,4,0,81,81,102,
        102,109,111,113,113,2,0,78,78,95,95,2,0,100,100,119,119,3,0,60,60,
        82,83,106,106,5,0,122,122,124,127,129,129,131,134,137,137,2,0,124,
        127,131,131,2,0,23,23,47,47,2,0,8,8,11,15,1,0,157,158,1,0,166,177,
        1,0,145,146,1,0,147,148,1,0,149,150,1,0,151,152,1,0,9,10,11,0,33,
        33,35,35,42,42,49,49,52,52,57,86,88,138,152,152,154,154,163,163,
        166,177,1,0,120,137,1163,0,134,1,0,0,0,2,149,1,0,0,0,4,151,1,0,0,
        0,6,154,1,0,0,0,8,183,1,0,0,0,10,194,1,0,0,0,12,199,1,0,0,0,14,324,
        1,0,0,0,16,326,1,0,0,0,18,329,1,0,0,0,20,342,1,0,0,0,22,352,1,0,
        0,0,24,359,1,0,0,0,26,363,1,0,0,0,28,365,1,0,0,0,30,371,1,0,0,0,
        32,379,1,0,0,0,34,385,1,0,0,0,36,391,1,0,0,0,38,393,1,0,0,0,40,406,
        1,0,0,0,42,415,1,0,0,0,44,423,1,0,0,0,46,445,1,0,0,0,48,447,1,0,
        0,0,50,475,1,0,0,0,52,484,1,0,0,0,54,529,1,0,0,0,56,563,1,0,0,0,
        58,565,1,0,0,0,60,578,1,0,0,0,62,580,1,0,0,0,64,601,1,0,0,0,66,699,
        1,0,0,0,68,716,1,0,0,0,70,718,1,0,0,0,72,751,1,0,0,0,74,778,1,0,
        0,0,76,789,1,0,0,0,78,805,1,0,0,0,80,818,1,0,0,0,82,825,1,0,0,0,
        84,829,1,0,0,0,86,840,1,0,0,0,88,856,1,0,0,0,90,860,1,0,0,0,92,870,
        1,0,0,0,94,872,1,0,0,0,96,912,1,0,0,0,98,920,1,0,0,0,100,947,1,0,
        0,0,102,950,1,0,0,0,104,952,1,0,0,0,106,970,1,0,0,0,108,976,1,0,
        0,0,110,982,1,0,0,0,112,984,1,0,0,0,114,986,1,0,0,0,116,988,1,0,
        0,0,118,991,1,0,0,0,120,997,1,0,0,0,122,1000,1,0,0,0,124,1004,1,
        0,0,0,126,1006,1,0,0,0,128,1009,1,0,0,0,130,1035,1,0,0,0,132,1038,
        1,0,0,0,134,139,3,2,1,0,135,136,5,6,0,0,136,138,3,2,1,0,137,135,
        1,0,0,0,138,141,1,0,0,0,139,137,1,0,0,0,139,140,1,0,0,0,140,143,
        1,0,0,0,141,139,1,0,0,0,142,144,5,6,0,0,143,142,1,0,0,0,143,144,
        1,0,0,0,144,145,1,0,0,0,145,146,5,0,0,1,146,1,1,0,0,0,147,150,3,
        6,3,0,148,150,3,4,2,0,149,147,1,0,0,0,149,148,1,0,0,0,150,3,1,0,
        0,0,151,152,5,33,0,0,152,153,3,126,63,0,153,5,1,0,0,0,154,181,3,
        8,4,0,155,156,5,26,0,0,156,157,3,40,20,0,157,158,3,44,22,0,158,182,
        1,0,0,0,159,160,3,40,20,0,160,161,5,26,0,0,161,162,3,44,22,0,162,
        182,1,0,0,0,163,164,3,40,20,0,164,165,3,44,22,0,165,166,5,26,0,0,
        166,182,1,0,0,0,167,170,5,26,0,0,168,171,3,40,20,0,169,171,3,44,
        22,0,170,168,1,0,0,0,170,169,1,0,0,0,170,171,1,0,0,0,171,182,1,0,
        0,0,172,175,3,40,20,0,173,176,5,26,0,0,174,176,3,44,22,0,175,173,
        1,0,0,0,175,174,1,0,0,0,175,176,1,0,0,0,176,182,1,0,0,0,177,179,
        3,44,22,0,178,180,5,26,0,0,179,178,1,0,0,0,179,180,1,0,0,0,180,182,
        1,0,0,0,181,155,1,0,0,0,181,159,1,0,0,0,181,163,1,0,0,0,181,167,
        1,0,0,0,181,172,1,0,0,0,181,177,1,0,0,0,181,182,1,0,0,0,182,7,1,
        0,0,0,183,185,3,12,6,0,184,186,3,40,20,0,185,184,1,0,0,0,185,186,
        1,0,0,0,186,192,1,0,0,0,187,189,3,10,5,0,188,187,1,0,0,0,189,190,
        1,0,0,0,190,188,1,0,0,0,190,191,1,0,0,0,191,193,1,0,0,0,192,188,
        1,0,0,0,192,193,1,0,0,0,193,9,1,0,0,0,194,195,7,0,0,0,195,197,3,
        12,6,0,196,198,3,40,20,0,197,196,1,0,0,0,197,198,1,0,0,0,198,11,
        1,0,0,0,199,201,5,49,0,0,200,202,3,14,7,0,201,200,1,0,0,0,201,202,
        1,0,0,0,202,203,1,0,0,0,203,206,3,18,9,0,204,205,7,1,0,0,205,207,
        3,128,64,0,206,204,1,0,0,0,206,207,1,0,0,0,207,210,1,0,0,0,208,209,
        5,38,0,0,209,211,3,94,47,0,210,208,1,0,0,0,210,211,1,0,0,0,211,214,
        1,0,0,0,212,213,5,56,0,0,213,215,3,74,37,0,214,212,1,0,0,0,214,215,
        1,0,0,0,215,242,1,0,0,0,216,217,5,141,0,0,217,218,5,4,0,0,218,219,
        5,4,0,0,219,220,3,90,45,0,220,228,5,5,0,0,221,222,5,7,0,0,222,223,
        5,4,0,0,223,224,3,90,45,0,224,225,5,5,0,0,225,227,1,0,0,0,226,221,
        1,0,0,0,227,230,1,0,0,0,228,226,1,0,0,0,228,229,1,0,0,0,229,231,
        1,0,0,0,230,228,1,0,0,0,231,232,5,5,0,0,232,243,1,0,0,0,233,234,
        5,142,0,0,234,239,3,52,26,0,235,236,5,7,0,0,236,238,3,52,26,0,237,
        235,1,0,0,0,238,241,1,0,0,0,239,237,1,0,0,0,239,240,1,0,0,0,240,
        243,1,0,0,0,241,239,1,0,0,0,242,216,1,0,0,0,242,233,1,0,0,0,242,
        243,1,0,0,0,243,246,1,0,0,0,244,245,5,39,0,0,245,247,3,74,37,0,246,
        244,1,0,0,0,246,247,1,0,0,0,247,252,1,0,0,0,248,250,5,144,0,0,249,
        251,3,132,66,0,250,249,1,0,0,0,250,251,1,0,0,0,251,253,1,0,0,0,252,
        248,1,0,0,0,252,253,1,0,0,0,253,281,1,0,0,0,254,255,5,139,0,0,255,
        256,5,4,0,0,256,261,3,38,19,0,257,258,5,7,0,0,258,260,3,38,19,0,
        259,257,1,0,0,0,260,263,1,0,0,0,261,259,1,0,0,0,261,262,1,0,0,0,
        262,264,1,0,0,0,263,261,1,0,0,0,264,265,5,5,0,0,265,282,1,0,0,0,
        266,267,5,140,0,0,267,269,3,36,18,0,268,270,5,87,0,0,269,268,1,0,
        0,0,269,270,1,0,0,0,270,278,1,0,0,0,271,272,5,7,0,0,272,274,3,36,
        18,0,273,275,5,87,0,0,274,273,1,0,0,0,274,275,1,0,0,0,275,277,1,
        0,0,0,276,271,1,0,0,0,277,280,1,0,0,0,278,276,1,0,0,0,278,279,1,
        0,0,0,279,282,1,0,0,0,280,278,1,0,0,0,281,254,1,0,0,0,281,266,1,
        0,0,0,281,282,1,0,0,0,282,13,1,0,0,0,283,287,3,16,8,0,284,287,5,
        32,0,0,285,287,5,21,0,0,286,283,1,0,0,0,286,284,1,0,0,0,286,285,
        1,0,0,0,287,325,1,0,0,0,288,289,5,21,0,0,289,290,5,32,0,0,290,325,
        3,16,8,0,291,292,5,21,0,0,292,293,3,16,8,0,293,294,5,32,0,0,294,
        325,1,0,0,0,295,296,3,16,8,0,296,297,5,21,0,0,297,298,5,32,0,0,298,
        325,1,0,0,0,299,300,3,16,8,0,300,301,5,32,0,0,301,302,5,21,0,0,302,
        325,1,0,0,0,303,304,5,32,0,0,304,305,5,21,0,0,305,325,3,16,8,0,306,
        307,5,32,0,0,307,308,3,16,8,0,308,309,5,21,0,0,309,325,1,0,0,0,310,
        311,5,21,0,0,311,325,5,32,0,0,312,313,5,21,0,0,313,325,3,16,8,0,
        314,315,5,32,0,0,315,325,5,21,0,0,316,317,5,32,0,0,317,325,3,16,
        8,0,318,319,3,16,8,0,319,320,5,21,0,0,320,325,1,0,0,0,321,322,3,
        16,8,0,322,323,5,32,0,0,323,325,1,0,0,0,324,286,1,0,0,0,324,288,
        1,0,0,0,324,291,1,0,0,0,324,295,1,0,0,0,324,299,1,0,0,0,324,303,
        1,0,0,0,324,306,1,0,0,0,324,310,1,0,0,0,324,312,1,0,0,0,324,314,
        1,0,0,0,324,316,1,0,0,0,324,318,1,0,0,0,324,321,1,0,0,0,325,15,1,
        0,0,0,326,327,5,51,0,0,327,328,5,160,0,0,328,17,1,0,0,0,329,334,
        3,20,10,0,330,331,5,7,0,0,331,333,3,20,10,0,332,330,1,0,0,0,333,
        336,1,0,0,0,334,332,1,0,0,0,334,335,1,0,0,0,335,19,1,0,0,0,336,334,
        1,0,0,0,337,343,3,22,11,0,338,343,3,26,13,0,339,343,3,28,14,0,340,
        343,3,32,16,0,341,343,3,24,12,0,342,337,1,0,0,0,342,338,1,0,0,0,
        342,339,1,0,0,0,342,340,1,0,0,0,342,341,1,0,0,0,343,345,1,0,0,0,
        344,346,3,118,59,0,345,344,1,0,0,0,345,346,1,0,0,0,346,21,1,0,0,
        0,347,348,3,126,63,0,348,349,5,3,0,0,349,351,1,0,0,0,350,347,1,0,
        0,0,351,354,1,0,0,0,352,350,1,0,0,0,352,353,1,0,0,0,353,355,1,0,
        0,0,354,352,1,0,0,0,355,356,5,16,0,0,356,23,1,0,0,0,357,360,3,52,
        26,0,358,360,3,74,37,0,359,357,1,0,0,0,359,358,1,0,0,0,360,25,1,
        0,0,0,361,364,5,45,0,0,362,364,3,34,17,0,363,361,1,0,0,0,363,362,
        1,0,0,0,364,27,1,0,0,0,365,366,5,71,0,0,366,367,5,3,0,0,367,368,
        5,4,0,0,368,369,3,30,15,0,369,370,5,5,0,0,370,29,1,0,0,0,371,376,
        3,118,59,0,372,373,5,7,0,0,373,375,3,118,59,0,374,372,1,0,0,0,375,
        378,1,0,0,0,376,374,1,0,0,0,376,377,1,0,0,0,377,31,1,0,0,0,378,376,
        1,0,0,0,379,380,3,50,25,0,380,381,5,3,0,0,381,382,5,4,0,0,382,383,
        3,18,9,0,383,384,5,5,0,0,384,33,1,0,0,0,385,386,5,92,0,0,386,387,
        5,4,0,0,387,388,5,5,0,0,388,35,1,0,0,0,389,392,3,130,65,0,390,392,
        3,50,25,0,391,389,1,0,0,0,391,390,1,0,0,0,392,37,1,0,0,0,393,394,
        5,4,0,0,394,399,3,36,18,0,395,396,5,7,0,0,396,398,3,36,18,0,397,
        395,1,0,0,0,398,401,1,0,0,0,399,397,1,0,0,0,399,400,1,0,0,0,400,
        402,1,0,0,0,401,399,1,0,0,0,402,404,5,5,0,0,403,405,5,87,0,0,404,
        403,1,0,0,0,404,405,1,0,0,0,405,39,1,0,0,0,406,407,5,143,0,0,407,
        412,3,42,21,0,408,409,5,7,0,0,409,411,3,42,21,0,410,408,1,0,0,0,
        411,414,1,0,0,0,412,410,1,0,0,0,412,413,1,0,0,0,413,41,1,0,0,0,414,
        412,1,0,0,0,415,421,3,52,26,0,416,422,7,2,0,0,417,419,5,156,0,0,
        418,420,5,31,0,0,419,418,1,0,0,0,419,420,1,0,0,0,420,422,1,0,0,0,
        421,416,1,0,0,0,421,417,1,0,0,0,421,422,1,0,0,0,422,43,1,0,0,0,423,
        425,5,52,0,0,424,426,3,18,9,0,425,424,1,0,0,0,425,426,1,0,0,0,426,
        427,1,0,0,0,427,428,5,28,0,0,428,433,3,46,23,0,429,430,5,7,0,0,430,
        432,3,46,23,0,431,429,1,0,0,0,432,435,1,0,0,0,433,431,1,0,0,0,433,
        434,1,0,0,0,434,45,1,0,0,0,435,433,1,0,0,0,436,446,5,48,0,0,437,
        440,3,52,26,0,438,441,7,3,0,0,439,441,3,48,24,0,440,438,1,0,0,0,
        440,439,1,0,0,0,440,441,1,0,0,0,441,443,1,0,0,0,442,444,3,118,59,
        0,443,442,1,0,0,0,443,444,1,0,0,0,444,446,1,0,0,0,445,436,1,0,0,
        0,445,437,1,0,0,0,446,47,1,0,0,0,447,448,5,89,0,0,448,449,5,4,0,
        0,449,452,7,4,0,0,450,451,5,7,0,0,451,453,3,52,26,0,452,450,1,0,
        0,0,452,453,1,0,0,0,453,456,1,0,0,0,454,455,5,7,0,0,455,457,3,52,
        26,0,456,454,1,0,0,0,456,457,1,0,0,0,457,458,1,0,0,0,458,459,5,5,
        0,0,459,49,1,0,0,0,460,463,3,126,63,0,461,462,5,3,0,0,462,464,3,
        126,63,0,463,461,1,0,0,0,464,465,1,0,0,0,465,463,1,0,0,0,465,466,
        1,0,0,0,466,476,1,0,0,0,467,476,3,126,63,0,468,471,3,132,66,0,469,
        470,5,3,0,0,470,472,3,126,63,0,471,469,1,0,0,0,472,473,1,0,0,0,473,
        471,1,0,0,0,473,474,1,0,0,0,474,476,1,0,0,0,475,460,1,0,0,0,475,
        467,1,0,0,0,475,468,1,0,0,0,476,51,1,0,0,0,477,478,6,26,-1,0,478,
        485,3,54,27,0,479,485,3,64,32,0,480,485,3,56,28,0,481,485,3,50,25,
        0,482,485,3,60,30,0,483,485,3,62,31,0,484,477,1,0,0,0,484,479,1,
        0,0,0,484,480,1,0,0,0,484,481,1,0,0,0,484,482,1,0,0,0,484,483,1,
        0,0,0,485,491,1,0,0,0,486,487,10,1,0,0,487,488,7,5,0,0,488,490,3,
        52,26,2,489,486,1,0,0,0,490,493,1,0,0,0,491,489,1,0,0,0,491,492,
        1,0,0,0,492,53,1,0,0,0,493,491,1,0,0,0,494,530,5,45,0,0,495,530,
        5,54,0,0,496,530,3,122,61,0,497,530,5,160,0,0,498,530,5,161,0,0,
        499,530,7,6,0,0,500,501,5,68,0,0,501,502,5,4,0,0,502,503,3,120,60,
        0,503,504,5,7,0,0,504,505,3,120,60,0,505,506,5,7,0,0,506,514,3,120,
        60,0,507,508,5,7,0,0,508,509,3,120,60,0,509,510,5,7,0,0,510,511,
        3,120,60,0,511,512,5,7,0,0,512,513,3,120,60,0,513,515,1,0,0,0,514,
        507,1,0,0,0,514,515,1,0,0,0,515,516,1,0,0,0,516,517,5,5,0,0,517,
        530,1,0,0,0,518,530,3,130,65,0,519,520,5,112,0,0,520,526,5,4,0,0,
        521,527,3,132,66,0,522,527,5,101,0,0,523,527,5,62,0,0,524,527,5,
        65,0,0,525,527,5,86,0,0,526,521,1,0,0,0,526,522,1,0,0,0,526,523,
        1,0,0,0,526,524,1,0,0,0,526,525,1,0,0,0,527,528,1,0,0,0,528,530,
        5,5,0,0,529,494,1,0,0,0,529,495,1,0,0,0,529,496,1,0,0,0,529,497,
        1,0,0,0,529,498,1,0,0,0,529,499,1,0,0,0,529,500,1,0,0,0,529,518,
        1,0,0,0,529,519,1,0,0,0,530,55,1,0,0,0,531,532,5,29,0,0,532,534,
        3,52,26,0,533,535,3,58,29,0,534,533,1,0,0,0,535,536,1,0,0,0,536,
        534,1,0,0,0,536,537,1,0,0,0,537,540,1,0,0,0,538,539,5,34,0,0,539,
        541,3,74,37,0,540,538,1,0,0,0,540,541,1,0,0,0,541,542,1,0,0,0,542,
        543,5,35,0,0,543,564,1,0,0,0,544,546,5,29,0,0,545,547,3,58,29,0,
        546,545,1,0,0,0,547,548,1,0,0,0,548,546,1,0,0,0,548,549,1,0,0,0,
        549,552,1,0,0,0,550,551,5,34,0,0,551,553,3,74,37,0,552,550,1,0,0,
        0,552,553,1,0,0,0,553,554,1,0,0,0,554,555,5,35,0,0,555,564,1,0,0,
        0,556,559,3,58,29,0,557,558,5,34,0,0,558,560,3,74,37,0,559,557,1,
        0,0,0,559,560,1,0,0,0,560,561,1,0,0,0,561,562,5,35,0,0,562,564,1,
        0,0,0,563,531,1,0,0,0,563,544,1,0,0,0,563,556,1,0,0,0,564,57,1,0,
        0,0,565,566,5,55,0,0,566,567,3,74,37,0,567,568,5,50,0,0,568,569,
        3,74,37,0,569,59,1,0,0,0,570,571,5,4,0,0,571,572,3,52,26,0,572,573,
        5,5,0,0,573,579,1,0,0,0,574,575,5,4,0,0,575,576,3,8,4,0,576,577,
        5,5,0,0,577,579,1,0,0,0,578,570,1,0,0,0,578,574,1,0,0,0,579,61,1,
        0,0,0,580,581,3,124,62,0,581,582,3,52,26,0,582,63,1,0,0,0,583,602,
        3,68,34,0,584,602,3,66,33,0,585,590,3,70,35,0,586,587,5,3,0,0,587,
        589,3,126,63,0,588,586,1,0,0,0,589,592,1,0,0,0,590,588,1,0,0,0,590,
        591,1,0,0,0,591,602,1,0,0,0,592,590,1,0,0,0,593,598,3,72,36,0,594,
        595,5,3,0,0,595,597,3,126,63,0,596,594,1,0,0,0,597,600,1,0,0,0,598,
        596,1,0,0,0,598,599,1,0,0,0,599,602,1,0,0,0,600,598,1,0,0,0,601,
        583,1,0,0,0,601,584,1,0,0,0,601,585,1,0,0,0,601,593,1,0,0,0,602,
        65,1,0,0,0,603,604,5,105,0,0,604,605,5,4,0,0,605,606,3,52,26,0,606,
        607,5,7,0,0,607,608,3,52,26,0,608,609,5,7,0,0,609,610,3,52,26,0,
        610,611,5,5,0,0,611,700,1,0,0,0,612,613,7,7,0,0,613,614,5,4,0,0,
        614,615,3,52,26,0,615,616,5,5,0,0,616,700,1,0,0,0,617,618,7,8,0,
        0,618,619,5,4,0,0,619,620,3,52,26,0,620,621,5,7,0,0,621,622,7,9,
        0,0,622,623,5,5,0,0,623,700,1,0,0,0,624,625,5,66,0,0,625,626,5,4,
        0,0,626,627,3,52,26,0,627,628,5,7,0,0,628,629,7,4,0,0,629,630,5,
        7,0,0,630,631,3,52,26,0,631,632,5,5,0,0,632,700,1,0,0,0,633,634,
        5,67,0,0,634,635,5,4,0,0,635,636,3,52,26,0,636,637,5,7,0,0,637,638,
        3,52,26,0,638,639,5,7,0,0,639,640,7,10,0,0,640,641,5,5,0,0,641,700,
        1,0,0,0,642,643,7,11,0,0,643,644,5,4,0,0,644,645,3,52,26,0,645,646,
        5,5,0,0,646,700,1,0,0,0,647,648,5,42,0,0,648,649,5,4,0,0,649,650,
        3,74,37,0,650,651,5,7,0,0,651,652,3,74,37,0,652,653,5,5,0,0,653,
        700,1,0,0,0,654,655,7,12,0,0,655,656,5,4,0,0,656,657,3,52,26,0,657,
        658,5,5,0,0,658,700,1,0,0,0,659,660,7,13,0,0,660,661,5,4,0,0,661,
        662,3,52,26,0,662,663,5,5,0,0,663,700,1,0,0,0,664,665,7,14,0,0,665,
        666,5,4,0,0,666,667,3,52,26,0,667,668,5,7,0,0,668,669,3,52,26,0,
        669,670,5,5,0,0,670,700,1,0,0,0,671,672,5,96,0,0,672,673,5,4,0,0,
        673,674,3,52,26,0,674,675,5,7,0,0,675,676,3,52,26,0,676,677,5,5,
        0,0,677,700,1,0,0,0,678,679,7,15,0,0,679,680,5,4,0,0,680,681,3,52,
        26,0,681,682,5,5,0,0,682,700,1,0,0,0,683,684,5,103,0,0,684,685,5,
        4,0,0,685,686,3,52,26,0,686,687,5,7,0,0,687,688,3,52,26,0,688,689,
        5,5,0,0,689,700,1,0,0,0,690,691,5,104,0,0,691,692,5,4,0,0,692,693,
        3,52,26,0,693,694,5,7,0,0,694,695,3,52,26,0,695,696,5,7,0,0,696,
        697,3,52,26,0,697,698,5,5,0,0,698,700,1,0,0,0,699,603,1,0,0,0,699,
        612,1,0,0,0,699,617,1,0,0,0,699,624,1,0,0,0,699,633,1,0,0,0,699,
        642,1,0,0,0,699,647,1,0,0,0,699,654,1,0,0,0,699,659,1,0,0,0,699,
        664,1,0,0,0,699,671,1,0,0,0,699,678,1,0,0,0,699,683,1,0,0,0,699,
        690,1,0,0,0,700,67,1,0,0,0,701,702,7,16,0,0,702,703,5,4,0,0,703,
        704,3,74,37,0,704,705,5,5,0,0,705,717,1,0,0,0,706,707,5,64,0,0,707,
        713,5,4,0,0,708,710,5,32,0,0,709,708,1,0,0,0,709,710,1,0,0,0,710,
        711,1,0,0,0,711,714,3,74,37,0,712,714,5,16,0,0,713,709,1,0,0,0,713,
        712,1,0,0,0,714,715,1,0,0,0,715,717,5,5,0,0,716,701,1,0,0,0,716,
        706,1,0,0,0,717,69,1,0,0,0,718,719,5,114,0,0,719,747,5,4,0,0,720,
        721,7,17,0,0,721,722,5,3,0,0,722,723,3,126,63,0,723,724,5,3,0,0,
        724,725,5,72,0,0,725,748,1,0,0,0,726,727,7,18,0,0,727,728,5,3,0,
        0,728,729,3,126,63,0,729,730,5,3,0,0,730,731,3,126,63,0,731,748,
        1,0,0,0,732,733,5,122,0,0,733,734,5,3,0,0,734,735,3,126,63,0,735,
        736,5,3,0,0,736,737,5,138,0,0,737,738,5,3,0,0,738,739,3,126,63,0,
        739,748,1,0,0,0,740,741,3,126,63,0,741,742,5,3,0,0,742,743,3,126,
        63,0,743,748,1,0,0,0,744,745,3,132,66,0,745,746,5,3,0,0,746,748,
        1,0,0,0,747,720,1,0,0,0,747,726,1,0,0,0,747,732,1,0,0,0,747,740,
        1,0,0,0,747,744,1,0,0,0,748,749,1,0,0,0,749,750,5,5,0,0,750,71,1,
        0,0,0,751,752,5,30,0,0,752,753,5,4,0,0,753,754,3,52,26,0,754,774,
        5,24,0,0,755,775,5,62,0,0,756,764,5,86,0,0,757,758,5,4,0,0,758,761,
        5,160,0,0,759,760,5,7,0,0,760,762,5,160,0,0,761,759,1,0,0,0,761,
        762,1,0,0,0,762,763,1,0,0,0,763,765,5,5,0,0,764,757,1,0,0,0,764,
        765,1,0,0,0,765,775,1,0,0,0,766,770,5,101,0,0,767,768,5,4,0,0,768,
        769,5,160,0,0,769,771,5,5,0,0,770,767,1,0,0,0,770,771,1,0,0,0,771,
        775,1,0,0,0,772,775,5,65,0,0,773,775,3,132,66,0,774,755,1,0,0,0,
        774,756,1,0,0,0,774,766,1,0,0,0,774,772,1,0,0,0,774,773,1,0,0,0,
        775,776,1,0,0,0,776,777,5,5,0,0,777,73,1,0,0,0,778,783,3,76,38,0,
        779,780,7,19,0,0,780,782,3,76,38,0,781,779,1,0,0,0,782,785,1,0,0,
        0,783,781,1,0,0,0,783,784,1,0,0,0,784,75,1,0,0,0,785,783,1,0,0,0,
        786,788,5,44,0,0,787,786,1,0,0,0,788,791,1,0,0,0,789,787,1,0,0,0,
        789,790,1,0,0,0,790,803,1,0,0,0,791,789,1,0,0,0,792,804,3,52,26,
        0,793,804,3,78,39,0,794,804,3,80,40,0,795,804,3,82,41,0,796,804,
        3,84,42,0,797,804,3,86,43,0,798,804,3,88,44,0,799,800,5,4,0,0,800,
        801,3,74,37,0,801,802,5,5,0,0,802,804,1,0,0,0,803,792,1,0,0,0,803,
        793,1,0,0,0,803,794,1,0,0,0,803,795,1,0,0,0,803,796,1,0,0,0,803,
        797,1,0,0,0,803,798,1,0,0,0,803,799,1,0,0,0,804,77,1,0,0,0,805,809,
        3,52,26,0,806,808,5,44,0,0,807,806,1,0,0,0,808,811,1,0,0,0,809,807,
        1,0,0,0,809,810,1,0,0,0,810,812,1,0,0,0,811,809,1,0,0,0,812,813,
        5,43,0,0,813,816,3,52,26,0,814,815,5,36,0,0,815,817,3,122,61,0,816,
        814,1,0,0,0,816,817,1,0,0,0,817,79,1,0,0,0,818,819,3,52,26,0,819,
        821,5,41,0,0,820,822,5,44,0,0,821,820,1,0,0,0,821,822,1,0,0,0,822,
        823,1,0,0,0,823,824,5,45,0,0,824,81,1,0,0,0,825,826,3,52,26,0,826,
        827,7,20,0,0,827,828,3,52,26,0,828,83,1,0,0,0,829,830,3,52,26,0,
        830,831,5,27,0,0,831,832,3,52,26,0,832,833,5,23,0,0,833,834,3,52,
        26,0,834,85,1,0,0,0,835,841,3,52,26,0,836,837,5,4,0,0,837,838,3,
        90,45,0,838,839,5,5,0,0,839,841,1,0,0,0,840,835,1,0,0,0,840,836,
        1,0,0,0,841,845,1,0,0,0,842,844,5,44,0,0,843,842,1,0,0,0,844,847,
        1,0,0,0,845,843,1,0,0,0,845,846,1,0,0,0,846,848,1,0,0,0,847,845,
        1,0,0,0,848,849,7,21,0,0,849,852,5,4,0,0,850,853,3,8,4,0,851,853,
        3,90,45,0,852,850,1,0,0,0,852,851,1,0,0,0,853,854,1,0,0,0,854,855,
        5,5,0,0,855,87,1,0,0,0,856,857,3,52,26,0,857,858,5,90,0,0,858,859,
        3,132,66,0,859,89,1,0,0,0,860,865,3,92,46,0,861,862,5,7,0,0,862,
        864,3,92,46,0,863,861,1,0,0,0,864,867,1,0,0,0,865,863,1,0,0,0,865,
        866,1,0,0,0,866,91,1,0,0,0,867,865,1,0,0,0,868,871,3,52,26,0,869,
        871,3,74,37,0,870,868,1,0,0,0,870,869,1,0,0,0,871,93,1,0,0,0,872,
        877,3,96,48,0,873,874,5,7,0,0,874,876,3,96,48,0,875,873,1,0,0,0,
        876,879,1,0,0,0,877,875,1,0,0,0,877,878,1,0,0,0,878,95,1,0,0,0,879,
        877,1,0,0,0,880,881,5,4,0,0,881,882,3,96,48,0,882,883,5,5,0,0,883,
        913,1,0,0,0,884,889,3,100,50,0,885,889,3,98,49,0,886,889,3,104,52,
        0,887,889,3,106,53,0,888,884,1,0,0,0,888,885,1,0,0,0,888,886,1,0,
        0,0,888,887,1,0,0,0,889,891,1,0,0,0,890,892,3,118,59,0,891,890,1,
        0,0,0,891,892,1,0,0,0,892,905,1,0,0,0,893,898,5,4,0,0,894,899,3,
        100,50,0,895,899,3,98,49,0,896,899,3,104,52,0,897,899,3,8,4,0,898,
        894,1,0,0,0,898,895,1,0,0,0,898,896,1,0,0,0,898,897,1,0,0,0,899,
        900,1,0,0,0,900,902,5,5,0,0,901,903,3,118,59,0,902,901,1,0,0,0,902,
        903,1,0,0,0,903,905,1,0,0,0,904,888,1,0,0,0,904,893,1,0,0,0,905,
        909,1,0,0,0,906,908,3,108,54,0,907,906,1,0,0,0,908,911,1,0,0,0,909,
        907,1,0,0,0,909,910,1,0,0,0,910,913,1,0,0,0,911,909,1,0,0,0,912,
        880,1,0,0,0,912,904,1,0,0,0,913,97,1,0,0,0,914,921,3,132,66,0,915,
        916,3,132,66,0,916,917,5,3,0,0,917,918,3,126,63,0,918,921,1,0,0,
        0,919,921,3,126,63,0,920,914,1,0,0,0,920,915,1,0,0,0,920,919,1,0,
        0,0,921,99,1,0,0,0,922,923,3,132,66,0,923,924,5,3,0,0,924,936,7,
        22,0,0,925,926,5,4,0,0,926,931,3,102,51,0,927,928,5,7,0,0,928,930,
        3,102,51,0,929,927,1,0,0,0,930,933,1,0,0,0,931,929,1,0,0,0,931,932,
        1,0,0,0,932,934,1,0,0,0,933,931,1,0,0,0,934,935,5,5,0,0,935,937,
        1,0,0,0,936,925,1,0,0,0,936,937,1,0,0,0,937,948,1,0,0,0,938,939,
        5,134,0,0,939,940,5,3,0,0,940,941,3,126,63,0,941,943,5,4,0,0,942,
        944,3,130,65,0,943,942,1,0,0,0,943,944,1,0,0,0,944,945,1,0,0,0,945,
        946,5,5,0,0,946,948,1,0,0,0,947,922,1,0,0,0,947,938,1,0,0,0,948,
        101,1,0,0,0,949,951,3,74,37,0,950,949,1,0,0,0,950,951,1,0,0,0,951,
        103,1,0,0,0,952,953,3,130,65,0,953,105,1,0,0,0,954,955,3,132,66,
        0,955,956,5,3,0,0,956,957,5,179,0,0,957,958,5,3,0,0,958,959,3,126,
        63,0,959,971,1,0,0,0,960,961,3,132,66,0,961,962,5,3,0,0,962,963,
        5,180,0,0,963,964,5,3,0,0,964,965,3,126,63,0,965,966,5,3,0,0,966,
        967,5,181,0,0,967,968,5,3,0,0,968,969,3,126,63,0,969,971,1,0,0,0,
        970,954,1,0,0,0,970,960,1,0,0,0,971,107,1,0,0,0,972,977,3,110,55,
        0,973,977,3,112,56,0,974,977,3,114,57,0,975,977,3,116,58,0,976,972,
        1,0,0,0,976,973,1,0,0,0,976,974,1,0,0,0,976,975,1,0,0,0,977,978,
        1,0,0,0,978,979,3,96,48,0,979,980,5,28,0,0,980,981,3,74,37,0,981,
        109,1,0,0,0,982,983,7,23,0,0,983,111,1,0,0,0,984,985,7,24,0,0,985,
        113,1,0,0,0,986,987,7,25,0,0,987,115,1,0,0,0,988,989,7,26,0,0,989,
        117,1,0,0,0,990,992,5,24,0,0,991,990,1,0,0,0,991,992,1,0,0,0,992,
        993,1,0,0,0,993,994,3,126,63,0,994,119,1,0,0,0,995,998,3,130,65,
        0,996,998,5,160,0,0,997,995,1,0,0,0,997,996,1,0,0,0,998,121,1,0,
        0,0,999,1001,5,182,0,0,1000,999,1,0,0,0,1001,1002,1,0,0,0,1002,1000,
        1,0,0,0,1002,1003,1,0,0,0,1003,123,1,0,0,0,1004,1005,7,27,0,0,1005,
        125,1,0,0,0,1006,1007,7,28,0,0,1007,127,1,0,0,0,1008,1010,5,3,0,
        0,1009,1008,1,0,0,0,1009,1010,1,0,0,0,1010,1033,1,0,0,0,1011,1013,
        5,18,0,0,1012,1011,1,0,0,0,1013,1014,1,0,0,0,1014,1012,1,0,0,0,1014,
        1015,1,0,0,0,1015,1034,1,0,0,0,1016,1034,3,126,63,0,1017,1020,3,
        126,63,0,1018,1020,5,18,0,0,1019,1017,1,0,0,0,1019,1018,1,0,0,0,
        1020,1021,1,0,0,0,1021,1019,1,0,0,0,1021,1022,1,0,0,0,1022,1026,
        1,0,0,0,1023,1025,5,160,0,0,1024,1023,1,0,0,0,1025,1028,1,0,0,0,
        1026,1024,1,0,0,0,1026,1027,1,0,0,0,1027,1030,1,0,0,0,1028,1026,
        1,0,0,0,1029,1019,1,0,0,0,1030,1031,1,0,0,0,1031,1029,1,0,0,0,1031,
        1032,1,0,0,0,1032,1034,1,0,0,0,1033,1012,1,0,0,0,1033,1016,1,0,0,
        0,1033,1029,1,0,0,0,1034,129,1,0,0,0,1035,1036,5,19,0,0,1036,1037,
        5,165,0,0,1037,131,1,0,0,0,1038,1039,7,29,0,0,1039,1040,5,3,0,0,
        1040,1041,3,126,63,0,1041,133,1,0,0,0,112,139,143,149,170,175,179,
        181,185,190,192,197,201,206,210,214,228,239,242,246,250,252,261,
        269,274,278,281,286,324,334,342,345,352,359,363,376,391,399,404,
        412,419,421,425,433,440,443,445,452,456,465,473,475,484,491,514,
        526,529,536,540,548,552,559,563,578,590,598,601,699,709,713,716,
        747,761,764,770,774,783,789,803,809,816,821,840,845,852,865,870,
        877,888,891,898,902,904,909,912,920,931,936,943,947,950,970,976,
        991,997,1002,1009,1014,1019,1021,1026,1031,1033
    ];

    private static __ATN: antlr.ATN;
    public static get _ATN(): antlr.ATN {
        if (!SDBLParser.__ATN) {
            SDBLParser.__ATN = new antlr.ATNDeserializer().deserialize(SDBLParser._serializedATN);
        }

        return SDBLParser.__ATN;
    }


    private static readonly vocabulary = new antlr.Vocabulary(SDBLParser.literalNames, SDBLParser.symbolicNames, []);

    public override get vocabulary(): antlr.Vocabulary {
        return SDBLParser.vocabulary;
    }

    private static readonly decisionsToDFA = SDBLParser._ATN.decisionToState.map( (ds: antlr.DecisionState, index: number) => new antlr.DFA(ds, index) );
}

export class QueryPackageContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public queries(): QueriesContext[];
    public queries(i: number): QueriesContext | null;
    public queries(i?: number): QueriesContext[] | QueriesContext | null {
        if (i === undefined) {
            return this.getRuleContexts(QueriesContext);
        }

        return this.getRuleContext(i, QueriesContext);
    }
    public EOF(): antlr.TerminalNode {
        return this.getToken(SDBLParser.EOF, 0)!;
    }
    public SEMICOLON(): antlr.TerminalNode[];
    public SEMICOLON(i: number): antlr.TerminalNode | null;
    public SEMICOLON(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.SEMICOLON);
    	} else {
    		return this.getToken(SDBLParser.SEMICOLON, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_queryPackage;
    }
}


export class QueriesContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public selectQuery(): SelectQueryContext | null {
        return this.getRuleContext(0, SelectQueryContext);
    }
    public dropTableQuery(): DropTableQueryContext | null {
        return this.getRuleContext(0, DropTableQueryContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_queries;
    }
}


export class DropTableQueryContext extends antlr.ParserRuleContext {
    public _temporaryTableName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DROP(): antlr.TerminalNode {
        return this.getToken(SDBLParser.DROP, 0)!;
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_dropTableQuery;
    }
}


export class SelectQueryContext extends antlr.ParserRuleContext {
    public _autoorder?: Token | null;
    public _orders?: OrderByContext;
    public _totals?: TotalByContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public subquery(): SubqueryContext {
        return this.getRuleContext(0, SubqueryContext)!;
    }
    public AUTOORDER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.AUTOORDER, 0);
    }
    public orderBy(): OrderByContext | null {
        return this.getRuleContext(0, OrderByContext);
    }
    public totalBy(): TotalByContext | null {
        return this.getRuleContext(0, TotalByContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_selectQuery;
    }
}


export class SubqueryContext extends antlr.ParserRuleContext {
    public _main?: QueryContext;
    public _union?: UnionContext;
    public _unions: UnionContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public query(): QueryContext {
        return this.getRuleContext(0, QueryContext)!;
    }
    public orderBy(): OrderByContext | null {
        return this.getRuleContext(0, OrderByContext);
    }
    public union(): UnionContext[];
    public union(i: number): UnionContext | null;
    public union(i?: number): UnionContext[] | UnionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(UnionContext);
        }

        return this.getRuleContext(i, UnionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_subquery;
    }
}


export class UnionContext extends antlr.ParserRuleContext {
    public _unionType?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public query(): QueryContext {
        return this.getRuleContext(0, QueryContext)!;
    }
    public UNION(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UNION, 0);
    }
    public UNION_ALL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UNION_ALL, 0);
    }
    public orderBy(): OrderByContext | null {
        return this.getRuleContext(0, OrderByContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_union;
    }
}


export class QueryContext extends antlr.ParserRuleContext {
    public _columns?: SelectedFieldsContext;
    public _temporaryTableName?: TemporaryTableIdentifierContext;
    public _from_?: DataSourcesContext;
    public _where?: LogicalExpressionContext;
    public _expressionList?: ExpressionListContext;
    public _groupingSet: ExpressionListContext[] = [];
    public _expression?: ExpressionContext;
    public _groupBy: ExpressionContext[] = [];
    public _having?: LogicalExpressionContext;
    public _forUpdate?: MdoContext;
    public _indexingSet?: IndexingSetContext;
    public _indexSets: IndexingSetContext[] = [];
    public _indexingItem?: IndexingItemContext;
    public _indexes: IndexingItemContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public SELECT(): antlr.TerminalNode {
        return this.getToken(SDBLParser.SELECT, 0)!;
    }
    public selectedFields(): SelectedFieldsContext {
        return this.getRuleContext(0, SelectedFieldsContext)!;
    }
    public limitations(): LimitationsContext | null {
        return this.getRuleContext(0, LimitationsContext);
    }
    public FROM(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FROM, 0);
    }
    public WHERE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.WHERE, 0);
    }
    public HAVING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HAVING, 0);
    }
    public FOR_UPDATE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FOR_UPDATE, 0);
    }
    public INTO(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INTO, 0);
    }
    public ADD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ADD, 0);
    }
    public temporaryTableIdentifier(): TemporaryTableIdentifierContext | null {
        return this.getRuleContext(0, TemporaryTableIdentifierContext);
    }
    public dataSources(): DataSourcesContext | null {
        return this.getRuleContext(0, DataSourcesContext);
    }
    public logicalExpression(): LogicalExpressionContext[];
    public logicalExpression(i: number): LogicalExpressionContext | null;
    public logicalExpression(i?: number): LogicalExpressionContext[] | LogicalExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(LogicalExpressionContext);
        }

        return this.getRuleContext(i, LogicalExpressionContext);
    }
    public GROUP_BY_GROUPING_SETS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.GROUP_BY_GROUPING_SETS, 0);
    }
    public LPAREN(): antlr.TerminalNode[];
    public LPAREN(i: number): antlr.TerminalNode | null;
    public LPAREN(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.LPAREN);
    	} else {
    		return this.getToken(SDBLParser.LPAREN, i);
    	}
    }
    public RPAREN(): antlr.TerminalNode[];
    public RPAREN(i: number): antlr.TerminalNode | null;
    public RPAREN(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.RPAREN);
    	} else {
    		return this.getToken(SDBLParser.RPAREN, i);
    	}
    }
    public GROUP_BY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.GROUP_BY, 0);
    }
    public INDEX_BY_SETS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INDEX_BY_SETS, 0);
    }
    public INDEX_BY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INDEX_BY, 0);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public indexingSet(): IndexingSetContext[];
    public indexingSet(i: number): IndexingSetContext | null;
    public indexingSet(i?: number): IndexingSetContext[] | IndexingSetContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IndexingSetContext);
        }

        return this.getRuleContext(i, IndexingSetContext);
    }
    public indexingItem(): IndexingItemContext[];
    public indexingItem(i: number): IndexingItemContext | null;
    public indexingItem(i?: number): IndexingItemContext[] | IndexingItemContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IndexingItemContext);
        }

        return this.getRuleContext(i, IndexingItemContext);
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public expressionList(): ExpressionListContext[];
    public expressionList(i: number): ExpressionListContext | null;
    public expressionList(i?: number): ExpressionListContext[] | ExpressionListContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionListContext);
        }

        return this.getRuleContext(i, ExpressionListContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public UNIQUE(): antlr.TerminalNode[];
    public UNIQUE(i: number): antlr.TerminalNode | null;
    public UNIQUE(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.UNIQUE);
    	} else {
    		return this.getToken(SDBLParser.UNIQUE, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_query;
    }
}


export class LimitationsContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public top(): TopContext | null {
        return this.getRuleContext(0, TopContext);
    }
    public DISTINCT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DISTINCT, 0);
    }
    public ALLOWED(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ALLOWED, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_limitations;
    }
}


export class TopContext extends antlr.ParserRuleContext {
    public _count?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TOP(): antlr.TerminalNode {
        return this.getToken(SDBLParser.TOP, 0)!;
    }
    public DECIMAL(): antlr.TerminalNode {
        return this.getToken(SDBLParser.DECIMAL, 0)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_top;
    }
}


export class SelectedFieldsContext extends antlr.ParserRuleContext {
    public _selectedField?: SelectedFieldContext;
    public _fields: SelectedFieldContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public selectedField(): SelectedFieldContext[];
    public selectedField(i: number): SelectedFieldContext | null;
    public selectedField(i?: number): SelectedFieldContext[] | SelectedFieldContext | null {
        if (i === undefined) {
            return this.getRuleContexts(SelectedFieldContext);
        }

        return this.getRuleContext(i, SelectedFieldContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_selectedFields;
    }
}


export class SelectedFieldContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public asteriskField(): AsteriskFieldContext | null {
        return this.getRuleContext(0, AsteriskFieldContext);
    }
    public columnField(): ColumnFieldContext | null {
        return this.getRuleContext(0, ColumnFieldContext);
    }
    public emptyTableField(): EmptyTableFieldContext | null {
        return this.getRuleContext(0, EmptyTableFieldContext);
    }
    public inlineTableField(): InlineTableFieldContext | null {
        return this.getRuleContext(0, InlineTableFieldContext);
    }
    public expressionField(): ExpressionFieldContext | null {
        return this.getRuleContext(0, ExpressionFieldContext);
    }
    public alias(): AliasContext | null {
        return this.getRuleContext(0, AliasContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_selectedField;
    }
}


export class AsteriskFieldContext extends antlr.ParserRuleContext {
    public _tableName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public MUL(): antlr.TerminalNode {
        return this.getToken(SDBLParser.MUL, 0)!;
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DOT);
    	} else {
    		return this.getToken(SDBLParser.DOT, i);
    	}
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_asteriskField;
    }
}


export class ExpressionFieldContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public logicalExpression(): LogicalExpressionContext | null {
        return this.getRuleContext(0, LogicalExpressionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_expressionField;
    }
}


export class ColumnFieldContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NULL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NULL, 0);
    }
    public recordAutoNumberFunction(): RecordAutoNumberFunctionContext | null {
        return this.getRuleContext(0, RecordAutoNumberFunctionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_columnField;
    }
}


export class EmptyTableFieldContext extends antlr.ParserRuleContext {
    public _emptyTable?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(SDBLParser.DOT, 0)!;
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LPAREN, 0)!;
    }
    public emptyTableColumns(): EmptyTableColumnsContext {
        return this.getRuleContext(0, EmptyTableColumnsContext)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RPAREN, 0)!;
    }
    public EMPTYTABLE(): antlr.TerminalNode {
        return this.getToken(SDBLParser.EMPTYTABLE, 0)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_emptyTableField;
    }
}


export class EmptyTableColumnsContext extends antlr.ParserRuleContext {
    public _alias?: AliasContext;
    public _columns: AliasContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public alias(): AliasContext[];
    public alias(i: number): AliasContext | null;
    public alias(i?: number): AliasContext[] | AliasContext | null {
        if (i === undefined) {
            return this.getRuleContexts(AliasContext);
        }

        return this.getRuleContext(i, AliasContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_emptyTableColumns;
    }
}


export class InlineTableFieldContext extends antlr.ParserRuleContext {
    public _inlineTable?: ColumnContext;
    public _inlineTableFields?: SelectedFieldsContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(SDBLParser.DOT, 0)!;
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LPAREN, 0)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RPAREN, 0)!;
    }
    public column(): ColumnContext {
        return this.getRuleContext(0, ColumnContext)!;
    }
    public selectedFields(): SelectedFieldsContext {
        return this.getRuleContext(0, SelectedFieldsContext)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_inlineTableField;
    }
}


export class RecordAutoNumberFunctionContext extends antlr.ParserRuleContext {
    public _doCall?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LPAREN, 0)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RPAREN, 0)!;
    }
    public RECORDAUTONUMBER(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RECORDAUTONUMBER, 0)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_recordAutoNumberFunction;
    }
}


export class IndexingItemContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public parameter(): ParameterContext | null {
        return this.getRuleContext(0, ParameterContext);
    }
    public column(): ColumnContext | null {
        return this.getRuleContext(0, ColumnContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_indexingItem;
    }
}


export class IndexingSetContext extends antlr.ParserRuleContext {
    public _indexingItem?: IndexingItemContext;
    public _indexes: IndexingItemContext[] = [];
    public _unique?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LPAREN, 0)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RPAREN, 0)!;
    }
    public indexingItem(): IndexingItemContext[];
    public indexingItem(i: number): IndexingItemContext | null;
    public indexingItem(i?: number): IndexingItemContext[] | IndexingItemContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IndexingItemContext);
        }

        return this.getRuleContext(i, IndexingItemContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public UNIQUE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UNIQUE, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_indexingSet;
    }
}


export class OrderByContext extends antlr.ParserRuleContext {
    public _ordersByExpression?: OrdersByExpressionContext;
    public _orders: OrdersByExpressionContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ORDER_BY(): antlr.TerminalNode {
        return this.getToken(SDBLParser.ORDER_BY, 0)!;
    }
    public ordersByExpression(): OrdersByExpressionContext[];
    public ordersByExpression(i: number): OrdersByExpressionContext | null;
    public ordersByExpression(i?: number): OrdersByExpressionContext[] | OrdersByExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(OrdersByExpressionContext);
        }

        return this.getRuleContext(i, OrdersByExpressionContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_orderBy;
    }
}


export class OrdersByExpressionContext extends antlr.ParserRuleContext {
    public _direction?: Token | null;
    public _hierarchy?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public ASC(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ASC, 0);
    }
    public DESC(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DESC, 0);
    }
    public HIERARCHY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HIERARCHY, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_ordersByExpression;
    }
}


export class TotalByContext extends antlr.ParserRuleContext {
    public _totalsGroup?: TotalsGroupContext;
    public _totalsGroups: TotalsGroupContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TOTALS(): antlr.TerminalNode {
        return this.getToken(SDBLParser.TOTALS, 0)!;
    }
    public BY(): antlr.TerminalNode {
        return this.getToken(SDBLParser.BY, 0)!;
    }
    public totalsGroup(): TotalsGroupContext[];
    public totalsGroup(i: number): TotalsGroupContext | null;
    public totalsGroup(i?: number): TotalsGroupContext[] | TotalsGroupContext | null {
        if (i === undefined) {
            return this.getRuleContexts(TotalsGroupContext);
        }

        return this.getRuleContext(i, TotalsGroupContext);
    }
    public selectedFields(): SelectedFieldsContext | null {
        return this.getRuleContext(0, SelectedFieldsContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_totalBy;
    }
}


export class TotalsGroupContext extends antlr.ParserRuleContext {
    public _hierarchyType?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public OVERALL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.OVERALL, 0);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public periodic(): PeriodicContext | null {
        return this.getRuleContext(0, PeriodicContext);
    }
    public alias(): AliasContext | null {
        return this.getRuleContext(0, AliasContext);
    }
    public ONLY_HIERARCHY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ONLY_HIERARCHY, 0);
    }
    public HIERARCHY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HIERARCHY, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_totalsGroup;
    }
}


export class PeriodicContext extends antlr.ParserRuleContext {
    public _periodType?: Token | null;
    public _first?: ExpressionContext;
    public _second?: ExpressionContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public PERIODS(): antlr.TerminalNode {
        return this.getToken(SDBLParser.PERIODS, 0)!;
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LPAREN, 0)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RPAREN, 0)!;
    }
    public SECOND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SECOND, 0);
    }
    public MINUTE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MINUTE, 0);
    }
    public HOUR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HOUR, 0);
    }
    public DAY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DAY, 0);
    }
    public WEEK(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.WEEK, 0);
    }
    public MONTH(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MONTH, 0);
    }
    public QUARTER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.QUARTER, 0);
    }
    public YEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.YEAR, 0);
    }
    public TENDAYS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TENDAYS, 0);
    }
    public HALFYEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HALFYEAR, 0);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_periodic;
    }
}


export class ColumnContext extends antlr.ParserRuleContext {
    public _mdoName?: IdentifierContext;
    public _identifier?: IdentifierContext;
    public _columnNames: IdentifierContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DOT);
    	} else {
    		return this.getToken(SDBLParser.DOT, i);
    	}
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_column;
    }
}


export class ExpressionContext extends antlr.ParserRuleContext {
    public _binaryOperation?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public primitiveExpression(): PrimitiveExpressionContext | null {
        return this.getRuleContext(0, PrimitiveExpressionContext);
    }
    public functionCall(): FunctionCallContext | null {
        return this.getRuleContext(0, FunctionCallContext);
    }
    public caseExpression(): CaseExpressionContext | null {
        return this.getRuleContext(0, CaseExpressionContext);
    }
    public column(): ColumnContext | null {
        return this.getRuleContext(0, ColumnContext);
    }
    public bracketExpression(): BracketExpressionContext | null {
        return this.getRuleContext(0, BracketExpressionContext);
    }
    public unaryExpression(): UnaryExpressionContext | null {
        return this.getRuleContext(0, UnaryExpressionContext);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public MUL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MUL, 0);
    }
    public QUOTIENT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.QUOTIENT, 0);
    }
    public PLUS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.PLUS, 0);
    }
    public MINUS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MINUS, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_expression;
    }
}


export class PrimitiveExpressionContext extends antlr.ParserRuleContext {
    public _booleanValue?: Token | null;
    public _year?: DatePartContext;
    public _month?: DatePartContext;
    public _day?: DatePartContext;
    public _hour?: DatePartContext;
    public _minute?: DatePartContext;
    public _second?: DatePartContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NULL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NULL, 0);
    }
    public UNDEFINED(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UNDEFINED, 0);
    }
    public multiString(): MultiStringContext | null {
        return this.getRuleContext(0, MultiStringContext);
    }
    public DECIMAL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DECIMAL, 0);
    }
    public FLOAT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FLOAT, 0);
    }
    public TRUE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRUE, 0);
    }
    public FALSE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FALSE, 0);
    }
    public DATETIME(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATETIME, 0);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public datePart(): DatePartContext[];
    public datePart(i: number): DatePartContext | null;
    public datePart(i?: number): DatePartContext[] | DatePartContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DatePartContext);
        }

        return this.getRuleContext(i, DatePartContext);
    }
    public parameter(): ParameterContext | null {
        return this.getRuleContext(0, ParameterContext);
    }
    public TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TYPE, 0);
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public STRING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRING, 0);
    }
    public BOOLEAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BOOLEAN, 0);
    }
    public DATE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATE, 0);
    }
    public NUMBER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NUMBER, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_primitiveExpression;
    }
}


export class CaseExpressionContext extends antlr.ParserRuleContext {
    public _caseExp?: ExpressionContext;
    public _elseExp?: LogicalExpressionContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public CASE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CASE, 0);
    }
    public END(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.END, 0);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public caseBranch(): CaseBranchContext[];
    public caseBranch(i: number): CaseBranchContext | null;
    public caseBranch(i?: number): CaseBranchContext[] | CaseBranchContext | null {
        if (i === undefined) {
            return this.getRuleContexts(CaseBranchContext);
        }

        return this.getRuleContext(i, CaseBranchContext);
    }
    public ELSE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ELSE, 0);
    }
    public logicalExpression(): LogicalExpressionContext | null {
        return this.getRuleContext(0, LogicalExpressionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_caseExpression;
    }
}


export class CaseBranchContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public WHEN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.WHEN, 0)!;
    }
    public logicalExpression(): LogicalExpressionContext[];
    public logicalExpression(i: number): LogicalExpressionContext | null;
    public logicalExpression(i?: number): LogicalExpressionContext[] | LogicalExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(LogicalExpressionContext);
        }

        return this.getRuleContext(i, LogicalExpressionContext);
    }
    public THEN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.THEN, 0)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_caseBranch;
    }
}


export class BracketExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public subquery(): SubqueryContext | null {
        return this.getRuleContext(0, SubqueryContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_bracketExpression;
    }
}


export class UnaryExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public sign(): SignContext {
        return this.getRuleContext(0, SignContext)!;
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_unaryExpression;
    }
}


export class FunctionCallContext extends antlr.ParserRuleContext {
    public _identifier?: IdentifierContext;
    public _columnNames: IdentifierContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public aggregateFunctions(): AggregateFunctionsContext | null {
        return this.getRuleContext(0, AggregateFunctionsContext);
    }
    public builtInFunctions(): BuiltInFunctionsContext | null {
        return this.getRuleContext(0, BuiltInFunctionsContext);
    }
    public valueFunction(): ValueFunctionContext | null {
        return this.getRuleContext(0, ValueFunctionContext);
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DOT);
    	} else {
    		return this.getToken(SDBLParser.DOT, i);
    	}
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public castFunction(): CastFunctionContext | null {
        return this.getRuleContext(0, CastFunctionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_functionCall;
    }
}


export class BuiltInFunctionsContext extends antlr.ParserRuleContext {
    public _doCall?: Token | null;
    public _string_?: ExpressionContext;
    public _charNo?: ExpressionContext;
    public _count?: ExpressionContext;
    public _date?: ExpressionContext;
    public _periodType?: Token | null;
    public _firstdate?: ExpressionContext;
    public _seconddate?: ExpressionContext;
    public _value?: ExpressionContext;
    public _first?: LogicalExpressionContext;
    public _second?: LogicalExpressionContext;
    public _decimal?: ExpressionContext;
    public _stringLength?: ExpressionContext;
    public _precise?: ExpressionContext;
    public _substring1?: ExpressionContext;
    public _substring2?: ExpressionContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public SUBSTRING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SUBSTRING, 0);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public YEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.YEAR, 0);
    }
    public QUARTER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.QUARTER, 0);
    }
    public MONTH(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MONTH, 0);
    }
    public DAYOFYEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DAYOFYEAR, 0);
    }
    public DAY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DAY, 0);
    }
    public WEEK(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.WEEK, 0);
    }
    public WEEKDAY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.WEEKDAY, 0);
    }
    public HOUR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HOUR, 0);
    }
    public MINUTE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MINUTE, 0);
    }
    public SECOND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SECOND, 0);
    }
    public BEGINOFPERIOD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BEGINOFPERIOD, 0);
    }
    public ENDOFPERIOD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ENDOFPERIOD, 0);
    }
    public TENDAYS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TENDAYS, 0);
    }
    public HALFYEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HALFYEAR, 0);
    }
    public DATEADD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATEADD, 0);
    }
    public DATEDIFF(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATEDIFF, 0);
    }
    public VALUETYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.VALUETYPE, 0);
    }
    public PRESENTATION(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.PRESENTATION, 0);
    }
    public REFPRESENTATION(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.REFPRESENTATION, 0);
    }
    public GROUPEDBY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.GROUPEDBY, 0);
    }
    public STRING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRING, 0);
    }
    public ISNULL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ISNULL, 0);
    }
    public logicalExpression(): LogicalExpressionContext[];
    public logicalExpression(i: number): LogicalExpressionContext | null;
    public logicalExpression(i?: number): LogicalExpressionContext[] | LogicalExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(LogicalExpressionContext);
        }

        return this.getRuleContext(i, LogicalExpressionContext);
    }
    public ACOS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACOS, 0);
    }
    public ASIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ASIN, 0);
    }
    public ATAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ATAN, 0);
    }
    public COS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.COS, 0);
    }
    public SIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SIN, 0);
    }
    public TAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TAN, 0);
    }
    public LOG(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LOG, 0);
    }
    public LOG10(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LOG10, 0);
    }
    public EXP(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXP, 0);
    }
    public POW(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.POW, 0);
    }
    public SQRT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SQRT, 0);
    }
    public INT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INT, 0);
    }
    public LOWER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LOWER, 0);
    }
    public STRINGLENGTH(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRINGLENGTH, 0);
    }
    public TRIMALL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRIMALL, 0);
    }
    public TRIML(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRIML, 0);
    }
    public TRIMR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRIMR, 0);
    }
    public UPPER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UPPER, 0);
    }
    public LEFT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LEFT, 0);
    }
    public RIGHT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RIGHT, 0);
    }
    public ROUND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ROUND, 0);
    }
    public STOREDDATASIZE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STOREDDATASIZE, 0);
    }
    public UUID(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UUID, 0);
    }
    public STRFIND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRFIND, 0);
    }
    public STRREPLACE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRREPLACE, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_builtInFunctions;
    }
}


export class AggregateFunctionsContext extends antlr.ParserRuleContext {
    public _doCall?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public logicalExpression(): LogicalExpressionContext | null {
        return this.getRuleContext(0, LogicalExpressionContext);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public SUM(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SUM, 0);
    }
    public AVG(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.AVG, 0);
    }
    public MIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MIN, 0);
    }
    public MAX(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MAX, 0);
    }
    public COUNT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.COUNT, 0);
    }
    public MUL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MUL, 0);
    }
    public DISTINCT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DISTINCT, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_aggregateFunctions;
    }
}


export class ValueFunctionContext extends antlr.ParserRuleContext {
    public _doCall?: Token | null;
    public _type_?: Token | null;
    public _mdoName?: IdentifierContext;
    public _emptyFer?: Token | null;
    public _predefinedName?: IdentifierContext;
    public _routePointName?: IdentifierContext;
    public _systemName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LPAREN, 0)!;
    }
    public RPAREN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.RPAREN, 0)!;
    }
    public VALUE(): antlr.TerminalNode {
        return this.getToken(SDBLParser.VALUE, 0)!;
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DOT);
    	} else {
    		return this.getToken(SDBLParser.DOT, i);
    	}
    }
    public ROUTEPOINT_FIELD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ROUTEPOINT_FIELD, 0);
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public EMPTYREF(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EMPTYREF, 0);
    }
    public BUSINESS_PROCESS_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BUSINESS_PROCESS_TYPE, 0);
    }
    public CATALOG_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CATALOG_TYPE, 0);
    }
    public DOCUMENT_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOCUMENT_TYPE, 0);
    }
    public FILTER_CRITERION_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FILTER_CRITERION_TYPE, 0);
    }
    public EXCHANGE_PLAN_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXCHANGE_PLAN_TYPE, 0);
    }
    public ENUM_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ENUM_TYPE, 0);
    }
    public CHART_OF_CHARACTERISTIC_TYPES_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE, 0);
    }
    public CHART_OF_ACCOUNTS_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_ACCOUNTS_TYPE, 0);
    }
    public CHART_OF_CALCULATION_TYPES_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE, 0);
    }
    public TASK_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TASK_TYPE, 0);
    }
    public EXTERNAL_DATA_SOURCE_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXTERNAL_DATA_SOURCE_TYPE, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_valueFunction;
    }
}


export class CastFunctionContext extends antlr.ParserRuleContext {
    public _doCall?: Token | null;
    public _value?: ExpressionContext;
    public _type_?: Token | null;
    public _len?: Token | null;
    public _prec?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode[];
    public LPAREN(i: number): antlr.TerminalNode | null;
    public LPAREN(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.LPAREN);
    	} else {
    		return this.getToken(SDBLParser.LPAREN, i);
    	}
    }
    public AS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.AS, 0);
    }
    public RPAREN(): antlr.TerminalNode[];
    public RPAREN(i: number): antlr.TerminalNode | null;
    public RPAREN(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.RPAREN);
    	} else {
    		return this.getToken(SDBLParser.RPAREN, i);
    	}
    }
    public CAST(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CAST, 0);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public BOOLEAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BOOLEAN, 0);
    }
    public DATE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATE, 0);
    }
    public NUMBER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NUMBER, 0);
    }
    public STRING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRING, 0);
    }
    public DECIMAL(): antlr.TerminalNode[];
    public DECIMAL(i: number): antlr.TerminalNode | null;
    public DECIMAL(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DECIMAL);
    	} else {
    		return this.getToken(SDBLParser.DECIMAL, i);
    	}
    }
    public COMMA(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.COMMA, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_castFunction;
    }
}


export class LogicalExpressionContext extends antlr.ParserRuleContext {
    public _predicate?: PredicateContext;
    public _condidions: PredicateContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public predicate(): PredicateContext[];
    public predicate(i: number): PredicateContext | null;
    public predicate(i?: number): PredicateContext[] | PredicateContext | null {
        if (i === undefined) {
            return this.getRuleContexts(PredicateContext);
        }

        return this.getRuleContext(i, PredicateContext);
    }
    public AND(): antlr.TerminalNode[];
    public AND(i: number): antlr.TerminalNode | null;
    public AND(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.AND);
    	} else {
    		return this.getToken(SDBLParser.AND, i);
    	}
    }
    public OR(): antlr.TerminalNode[];
    public OR(i: number): antlr.TerminalNode | null;
    public OR(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.OR);
    	} else {
    		return this.getToken(SDBLParser.OR, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_logicalExpression;
    }
}


export class PredicateContext extends antlr.ParserRuleContext {
    public _booleanPredicate?: ExpressionContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public likePredicate(): LikePredicateContext | null {
        return this.getRuleContext(0, LikePredicateContext);
    }
    public isNullPredicate(): IsNullPredicateContext | null {
        return this.getRuleContext(0, IsNullPredicateContext);
    }
    public comparePredicate(): ComparePredicateContext | null {
        return this.getRuleContext(0, ComparePredicateContext);
    }
    public betweenPredicate(): BetweenPredicateContext | null {
        return this.getRuleContext(0, BetweenPredicateContext);
    }
    public inPredicate(): InPredicateContext | null {
        return this.getRuleContext(0, InPredicateContext);
    }
    public refsPredicate(): RefsPredicateContext | null {
        return this.getRuleContext(0, RefsPredicateContext);
    }
    public NOT(): antlr.TerminalNode[];
    public NOT(i: number): antlr.TerminalNode | null;
    public NOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.NOT);
    	} else {
    		return this.getToken(SDBLParser.NOT, i);
    	}
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public logicalExpression(): LogicalExpressionContext | null {
        return this.getRuleContext(0, LogicalExpressionContext);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_predicate;
    }
}


export class LikePredicateContext extends antlr.ParserRuleContext {
    public _escape?: MultiStringContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public LIKE(): antlr.TerminalNode {
        return this.getToken(SDBLParser.LIKE, 0)!;
    }
    public NOT(): antlr.TerminalNode[];
    public NOT(i: number): antlr.TerminalNode | null;
    public NOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.NOT);
    	} else {
    		return this.getToken(SDBLParser.NOT, i);
    	}
    }
    public ESCAPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ESCAPE, 0);
    }
    public multiString(): MultiStringContext | null {
        return this.getRuleContext(0, MultiStringContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_likePredicate;
    }
}


export class IsNullPredicateContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public IS(): antlr.TerminalNode {
        return this.getToken(SDBLParser.IS, 0)!;
    }
    public NULL(): antlr.TerminalNode {
        return this.getToken(SDBLParser.NULL, 0)!;
    }
    public NOT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NOT, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_isNullPredicate;
    }
}


export class ComparePredicateContext extends antlr.ParserRuleContext {
    public _compareOperation?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public LESS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LESS, 0);
    }
    public LESS_OR_EQUAL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LESS_OR_EQUAL, 0);
    }
    public GREATER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.GREATER, 0);
    }
    public GREATER_OR_EQUAL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.GREATER_OR_EQUAL, 0);
    }
    public ASSIGN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ASSIGN, 0);
    }
    public NOT_EQUAL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NOT_EQUAL, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_comparePredicate;
    }
}


export class BetweenPredicateContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext[];
    public expression(i: number): ExpressionContext | null;
    public expression(i?: number): ExpressionContext[] | ExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionContext);
        }

        return this.getRuleContext(i, ExpressionContext);
    }
    public BETWEEN(): antlr.TerminalNode {
        return this.getToken(SDBLParser.BETWEEN, 0)!;
    }
    public AND(): antlr.TerminalNode {
        return this.getToken(SDBLParser.AND, 0)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_betweenPredicate;
    }
}


export class InPredicateContext extends antlr.ParserRuleContext {
    public _typeIn?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode[];
    public LPAREN(i: number): antlr.TerminalNode | null;
    public LPAREN(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.LPAREN);
    	} else {
    		return this.getToken(SDBLParser.LPAREN, i);
    	}
    }
    public RPAREN(): antlr.TerminalNode[];
    public RPAREN(i: number): antlr.TerminalNode | null;
    public RPAREN(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.RPAREN);
    	} else {
    		return this.getToken(SDBLParser.RPAREN, i);
    	}
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public IN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.IN, 0);
    }
    public IN_HIERARCHY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.IN_HIERARCHY, 0);
    }
    public subquery(): SubqueryContext | null {
        return this.getRuleContext(0, SubqueryContext);
    }
    public expressionList(): ExpressionListContext[];
    public expressionList(i: number): ExpressionListContext | null;
    public expressionList(i?: number): ExpressionListContext[] | ExpressionListContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionListContext);
        }

        return this.getRuleContext(i, ExpressionListContext);
    }
    public NOT(): antlr.TerminalNode[];
    public NOT(i: number): antlr.TerminalNode | null;
    public NOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.NOT);
    	} else {
    		return this.getToken(SDBLParser.NOT, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_inPredicate;
    }
}


export class RefsPredicateContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext {
        return this.getRuleContext(0, ExpressionContext)!;
    }
    public REFS(): antlr.TerminalNode {
        return this.getToken(SDBLParser.REFS, 0)!;
    }
    public mdo(): MdoContext {
        return this.getRuleContext(0, MdoContext)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_refsPredicate;
    }
}


export class ExpressionListContext extends antlr.ParserRuleContext {
    public _expressionListItem?: ExpressionListItemContext;
    public _exp: ExpressionListItemContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expressionListItem(): ExpressionListItemContext[];
    public expressionListItem(i: number): ExpressionListItemContext | null;
    public expressionListItem(i?: number): ExpressionListItemContext[] | ExpressionListItemContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ExpressionListItemContext);
        }

        return this.getRuleContext(i, ExpressionListItemContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_expressionList;
    }
}


export class ExpressionListItemContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public expression(): ExpressionContext | null {
        return this.getRuleContext(0, ExpressionContext);
    }
    public logicalExpression(): LogicalExpressionContext | null {
        return this.getRuleContext(0, LogicalExpressionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_expressionListItem;
    }
}


export class DataSourcesContext extends antlr.ParserRuleContext {
    public _dataSource?: DataSourceContext;
    public _tables: DataSourceContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public dataSource(): DataSourceContext[];
    public dataSource(i: number): DataSourceContext | null;
    public dataSource(i?: number): DataSourceContext[] | DataSourceContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DataSourceContext);
        }

        return this.getRuleContext(i, DataSourceContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_dataSources;
    }
}


export class DataSourceContext extends antlr.ParserRuleContext {
    public _joinPart?: JoinPartContext;
    public _joins: JoinPartContext[] = [];
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public dataSource(): DataSourceContext | null {
        return this.getRuleContext(0, DataSourceContext);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public joinPart(): JoinPartContext[];
    public joinPart(i: number): JoinPartContext | null;
    public joinPart(i?: number): JoinPartContext[] | JoinPartContext | null {
        if (i === undefined) {
            return this.getRuleContexts(JoinPartContext);
        }

        return this.getRuleContext(i, JoinPartContext);
    }
    public virtualTable(): VirtualTableContext | null {
        return this.getRuleContext(0, VirtualTableContext);
    }
    public table(): TableContext | null {
        return this.getRuleContext(0, TableContext);
    }
    public parameterTable(): ParameterTableContext | null {
        return this.getRuleContext(0, ParameterTableContext);
    }
    public externalDataSourceTable(): ExternalDataSourceTableContext | null {
        return this.getRuleContext(0, ExternalDataSourceTableContext);
    }
    public subquery(): SubqueryContext | null {
        return this.getRuleContext(0, SubqueryContext);
    }
    public alias(): AliasContext | null {
        return this.getRuleContext(0, AliasContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_dataSource;
    }
}


export class TableContext extends antlr.ParserRuleContext {
    public _objectTableName?: IdentifierContext;
    public _tableName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public DOT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOT, 0);
    }
    public identifier(): IdentifierContext | null {
        return this.getRuleContext(0, IdentifierContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_table;
    }
}


export class VirtualTableContext extends antlr.ParserRuleContext {
    public _virtualTableName?: Token | null;
    public _virtualTableParameter?: VirtualTableParameterContext;
    public _virtualTableParameters: VirtualTableParameterContext[] = [];
    public _type_?: Token | null;
    public _tableName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public mdo(): MdoContext | null {
        return this.getRuleContext(0, MdoContext);
    }
    public DOT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOT, 0);
    }
    public SLICELAST_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SLICELAST_VT, 0);
    }
    public SLICEFIRST_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SLICEFIRST_VT, 0);
    }
    public BOUNDARIES_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BOUNDARIES_VT, 0);
    }
    public TURNOVERS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TURNOVERS_VT, 0);
    }
    public BALANCE_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BALANCE_VT, 0);
    }
    public BALANCE_AND_TURNOVERS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BALANCE_AND_TURNOVERS_VT, 0);
    }
    public EXT_DIMENSIONS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXT_DIMENSIONS_VT, 0);
    }
    public RECORDS_WITH_EXT_DIMENSIONS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT, 0);
    }
    public DR_CR_TURNOVERS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DR_CR_TURNOVERS_VT, 0);
    }
    public ACTUAL_ACTION_PERIOD_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACTUAL_ACTION_PERIOD_VT, 0);
    }
    public SCHEDULE_DATA_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SCHEDULE_DATA_VT, 0);
    }
    public TASK_BY_PERFORMER_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TASK_BY_PERFORMER_VT, 0);
    }
    public LPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LPAREN, 0);
    }
    public RPAREN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RPAREN, 0);
    }
    public virtualTableParameter(): VirtualTableParameterContext[];
    public virtualTableParameter(i: number): VirtualTableParameterContext | null;
    public virtualTableParameter(i?: number): VirtualTableParameterContext[] | VirtualTableParameterContext | null {
        if (i === undefined) {
            return this.getRuleContexts(VirtualTableParameterContext);
        }

        return this.getRuleContext(i, VirtualTableParameterContext);
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.COMMA);
    	} else {
    		return this.getToken(SDBLParser.COMMA, i);
    	}
    }
    public FILTER_CRITERION_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FILTER_CRITERION_TYPE, 0);
    }
    public identifier(): IdentifierContext | null {
        return this.getRuleContext(0, IdentifierContext);
    }
    public parameter(): ParameterContext | null {
        return this.getRuleContext(0, ParameterContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_virtualTable;
    }
}


export class VirtualTableParameterContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public logicalExpression(): LogicalExpressionContext | null {
        return this.getRuleContext(0, LogicalExpressionContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_virtualTableParameter;
    }
}


export class ParameterTableContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public parameter(): ParameterContext {
        return this.getRuleContext(0, ParameterContext)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_parameterTable;
    }
}


export class ExternalDataSourceTableContext extends antlr.ParserRuleContext {
    public _tableName?: IdentifierContext;
    public _cubeName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public mdo(): MdoContext {
        return this.getRuleContext(0, MdoContext)!;
    }
    public DOT(): antlr.TerminalNode[];
    public DOT(i: number): antlr.TerminalNode | null;
    public DOT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DOT);
    	} else {
    		return this.getToken(SDBLParser.DOT, i);
    	}
    }
    public EDS_TABLE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EDS_TABLE, 0);
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public EDS_CUBE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EDS_CUBE, 0);
    }
    public EDS_CUBE_DIMTABLE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EDS_CUBE_DIMTABLE, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_externalDataSourceTable;
    }
}


export class JoinPartContext extends antlr.ParserRuleContext {
    public _source?: DataSourceContext;
    public _condition?: LogicalExpressionContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public BY(): antlr.TerminalNode {
        return this.getToken(SDBLParser.BY, 0)!;
    }
    public dataSource(): DataSourceContext {
        return this.getRuleContext(0, DataSourceContext)!;
    }
    public logicalExpression(): LogicalExpressionContext {
        return this.getRuleContext(0, LogicalExpressionContext)!;
    }
    public rightJoin(): RightJoinContext | null {
        return this.getRuleContext(0, RightJoinContext);
    }
    public leftJoin(): LeftJoinContext | null {
        return this.getRuleContext(0, LeftJoinContext);
    }
    public fullJoin(): FullJoinContext | null {
        return this.getRuleContext(0, FullJoinContext);
    }
    public innerJoin(): InnerJoinContext | null {
        return this.getRuleContext(0, InnerJoinContext);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_joinPart;
    }
}


export class RightJoinContext extends antlr.ParserRuleContext {
    public _keyword?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public RIGHT_OUTER_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RIGHT_OUTER_JOIN, 0);
    }
    public RIGHT_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RIGHT_JOIN, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_rightJoin;
    }
}


export class LeftJoinContext extends antlr.ParserRuleContext {
    public _keyword?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LEFT_OUTER_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LEFT_OUTER_JOIN, 0);
    }
    public LEFT_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LEFT_JOIN, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_leftJoin;
    }
}


export class FullJoinContext extends antlr.ParserRuleContext {
    public _keyword?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FULL_OUTER_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FULL_OUTER_JOIN, 0);
    }
    public FULL_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FULL_JOIN, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_fullJoin;
    }
}


export class InnerJoinContext extends antlr.ParserRuleContext {
    public _keyword?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public INNER_JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INNER_JOIN, 0);
    }
    public JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.JOIN, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_innerJoin;
    }
}


export class AliasContext extends antlr.ParserRuleContext {
    public _name?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public AS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.AS, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_alias;
    }
}


export class DatePartContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public parameter(): ParameterContext | null {
        return this.getRuleContext(0, ParameterContext);
    }
    public DECIMAL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DECIMAL, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_datePart;
    }
}


export class MultiStringContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public STR(): antlr.TerminalNode[];
    public STR(i: number): antlr.TerminalNode | null;
    public STR(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.STR);
    	} else {
    		return this.getToken(SDBLParser.STR, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_multiString;
    }
}


export class SignContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public MINUS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MINUS, 0);
    }
    public PLUS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.PLUS, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_sign;
    }
}


export class IdentifierContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.IDENTIFIER, 0);
    }
    public ACTUAL_ACTION_PERIOD_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACTUAL_ACTION_PERIOD_VT, 0);
    }
    public BALANCE_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BALANCE_VT, 0);
    }
    public BALANCE_AND_TURNOVERS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BALANCE_AND_TURNOVERS_VT, 0);
    }
    public BOUNDARIES_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BOUNDARIES_VT, 0);
    }
    public DR_CR_TURNOVERS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DR_CR_TURNOVERS_VT, 0);
    }
    public EXT_DIMENSIONS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXT_DIMENSIONS_VT, 0);
    }
    public RECORDS_WITH_EXT_DIMENSIONS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RECORDS_WITH_EXT_DIMENSIONS_VT, 0);
    }
    public SCHEDULE_DATA_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SCHEDULE_DATA_VT, 0);
    }
    public SLICEFIRST_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SLICEFIRST_VT, 0);
    }
    public SLICELAST_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SLICELAST_VT, 0);
    }
    public TASK_BY_PERFORMER_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TASK_BY_PERFORMER_VT, 0);
    }
    public TURNOVERS_VT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TURNOVERS_VT, 0);
    }
    public ROUTEPOINT_FIELD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ROUTEPOINT_FIELD, 0);
    }
    public BUSINESS_PROCESS_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BUSINESS_PROCESS_TYPE, 0);
    }
    public CATALOG_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CATALOG_TYPE, 0);
    }
    public DOCUMENT_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOCUMENT_TYPE, 0);
    }
    public INFORMATION_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INFORMATION_REGISTER_TYPE, 0);
    }
    public CONSTANT_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CONSTANT_TYPE, 0);
    }
    public FILTER_CRITERION_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FILTER_CRITERION_TYPE, 0);
    }
    public EXCHANGE_PLAN_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXCHANGE_PLAN_TYPE, 0);
    }
    public SEQUENCE_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SEQUENCE_TYPE, 0);
    }
    public DOCUMENT_JOURNAL_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOCUMENT_JOURNAL_TYPE, 0);
    }
    public ENUM_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ENUM_TYPE, 0);
    }
    public CHART_OF_CHARACTERISTIC_TYPES_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE, 0);
    }
    public CHART_OF_ACCOUNTS_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_ACCOUNTS_TYPE, 0);
    }
    public CHART_OF_CALCULATION_TYPES_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE, 0);
    }
    public ACCUMULATION_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACCUMULATION_REGISTER_TYPE, 0);
    }
    public ACCOUNTING_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACCOUNTING_REGISTER_TYPE, 0);
    }
    public CALCULATION_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CALCULATION_REGISTER_TYPE, 0);
    }
    public TASK_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TASK_TYPE, 0);
    }
    public EXTERNAL_DATA_SOURCE_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXTERNAL_DATA_SOURCE_TYPE, 0);
    }
    public DROP(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DROP, 0);
    }
    public END(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.END, 0);
    }
    public ISNULL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ISNULL, 0);
    }
    public JOIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.JOIN, 0);
    }
    public SELECT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SELECT, 0);
    }
    public TOTALS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TOTALS, 0);
    }
    public UNION(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UNION, 0);
    }
    public AVG(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.AVG, 0);
    }
    public BEGINOFPERIOD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BEGINOFPERIOD, 0);
    }
    public BOOLEAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BOOLEAN, 0);
    }
    public COUNT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.COUNT, 0);
    }
    public DATE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATE, 0);
    }
    public DATEADD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATEADD, 0);
    }
    public DATEDIFF(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATEDIFF, 0);
    }
    public DATETIME(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DATETIME, 0);
    }
    public DAY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DAY, 0);
    }
    public DAYOFYEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DAYOFYEAR, 0);
    }
    public EMPTYTABLE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EMPTYTABLE, 0);
    }
    public EMPTYREF(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EMPTYREF, 0);
    }
    public ENDOFPERIOD(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ENDOFPERIOD, 0);
    }
    public HALFYEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HALFYEAR, 0);
    }
    public HOUR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.HOUR, 0);
    }
    public MAX(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MAX, 0);
    }
    public MIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MIN, 0);
    }
    public MINUTE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MINUTE, 0);
    }
    public MONTH(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.MONTH, 0);
    }
    public NUMBER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.NUMBER, 0);
    }
    public QUARTER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.QUARTER, 0);
    }
    public PERIODS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.PERIODS, 0);
    }
    public REFS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.REFS, 0);
    }
    public PRESENTATION(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.PRESENTATION, 0);
    }
    public RECORDAUTONUMBER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RECORDAUTONUMBER, 0);
    }
    public REFPRESENTATION(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.REFPRESENTATION, 0);
    }
    public SECOND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SECOND, 0);
    }
    public STRING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRING, 0);
    }
    public SUBSTRING(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SUBSTRING, 0);
    }
    public SUM(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SUM, 0);
    }
    public TENDAYS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TENDAYS, 0);
    }
    public TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TYPE, 0);
    }
    public VALUE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.VALUE, 0);
    }
    public VALUETYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.VALUETYPE, 0);
    }
    public WEEK(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.WEEK, 0);
    }
    public WEEKDAY(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.WEEKDAY, 0);
    }
    public YEAR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.YEAR, 0);
    }
    public RIGHT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.RIGHT, 0);
    }
    public LEFT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LEFT, 0);
    }
    public ACOS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACOS, 0);
    }
    public ASIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ASIN, 0);
    }
    public ATAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ATAN, 0);
    }
    public COS(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.COS, 0);
    }
    public SIN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SIN, 0);
    }
    public TAN(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TAN, 0);
    }
    public LOG(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LOG, 0);
    }
    public LOG10(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LOG10, 0);
    }
    public EXP(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXP, 0);
    }
    public POW(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.POW, 0);
    }
    public SQRT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SQRT, 0);
    }
    public INT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INT, 0);
    }
    public LOWER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.LOWER, 0);
    }
    public STRINGLENGTH(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRINGLENGTH, 0);
    }
    public TRIMALL(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRIMALL, 0);
    }
    public TRIML(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRIML, 0);
    }
    public TRIMR(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TRIMR, 0);
    }
    public UPPER(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UPPER, 0);
    }
    public ROUND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ROUND, 0);
    }
    public STOREDDATASIZE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STOREDDATASIZE, 0);
    }
    public UUID(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.UUID, 0);
    }
    public STRFIND(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRFIND, 0);
    }
    public STRREPLACE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.STRREPLACE, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_identifier;
    }
}


export class TemporaryTableIdentifierContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public DOT(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOT, 0);
    }
    public NUMBER_SIGH(): antlr.TerminalNode[];
    public NUMBER_SIGH(i: number): antlr.TerminalNode | null;
    public NUMBER_SIGH(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.NUMBER_SIGH);
    	} else {
    		return this.getToken(SDBLParser.NUMBER_SIGH, i);
    	}
    }
    public DECIMAL(): antlr.TerminalNode[];
    public DECIMAL(i: number): antlr.TerminalNode | null;
    public DECIMAL(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(SDBLParser.DECIMAL);
    	} else {
    		return this.getToken(SDBLParser.DECIMAL, i);
    	}
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_temporaryTableIdentifier;
    }
}


export class ParameterContext extends antlr.ParserRuleContext {
    public _name?: Token | null;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public AMPERSAND(): antlr.TerminalNode {
        return this.getToken(SDBLParser.AMPERSAND, 0)!;
    }
    public PARAMETER_IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(SDBLParser.PARAMETER_IDENTIFIER, 0)!;
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_parameter;
    }
}


export class MdoContext extends antlr.ParserRuleContext {
    public _type_?: Token | null;
    public _tableName?: IdentifierContext;
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public DOT(): antlr.TerminalNode {
        return this.getToken(SDBLParser.DOT, 0)!;
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public BUSINESS_PROCESS_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.BUSINESS_PROCESS_TYPE, 0);
    }
    public CATALOG_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CATALOG_TYPE, 0);
    }
    public DOCUMENT_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOCUMENT_TYPE, 0);
    }
    public INFORMATION_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.INFORMATION_REGISTER_TYPE, 0);
    }
    public CONSTANT_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CONSTANT_TYPE, 0);
    }
    public FILTER_CRITERION_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.FILTER_CRITERION_TYPE, 0);
    }
    public EXCHANGE_PLAN_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXCHANGE_PLAN_TYPE, 0);
    }
    public SEQUENCE_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.SEQUENCE_TYPE, 0);
    }
    public DOCUMENT_JOURNAL_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.DOCUMENT_JOURNAL_TYPE, 0);
    }
    public ENUM_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ENUM_TYPE, 0);
    }
    public CHART_OF_CHARACTERISTIC_TYPES_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_CHARACTERISTIC_TYPES_TYPE, 0);
    }
    public CHART_OF_ACCOUNTS_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_ACCOUNTS_TYPE, 0);
    }
    public CHART_OF_CALCULATION_TYPES_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CHART_OF_CALCULATION_TYPES_TYPE, 0);
    }
    public ACCUMULATION_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACCUMULATION_REGISTER_TYPE, 0);
    }
    public ACCOUNTING_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.ACCOUNTING_REGISTER_TYPE, 0);
    }
    public CALCULATION_REGISTER_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.CALCULATION_REGISTER_TYPE, 0);
    }
    public TASK_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.TASK_TYPE, 0);
    }
    public EXTERNAL_DATA_SOURCE_TYPE(): antlr.TerminalNode | null {
        return this.getToken(SDBLParser.EXTERNAL_DATA_SOURCE_TYPE, 0);
    }
    public override get ruleIndex(): number {
        return SDBLParser.RULE_mdo;
    }
}
