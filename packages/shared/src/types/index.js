"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = exports.PRStatus = exports.ProjectStatus = exports.TenderStatus = void 0;
var TenderStatus;
(function (TenderStatus) {
    TenderStatus["DRAFT"] = "DRAFT";
    TenderStatus["SUBMITTED"] = "SUBMITTED";
    TenderStatus["AWARDED"] = "AWARDED";
    TenderStatus["LOST"] = "LOST";
    TenderStatus["CANCELLED"] = "CANCELLED";
})(TenderStatus || (exports.TenderStatus = TenderStatus = {}));
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["PLANNING"] = "PLANNING";
    ProjectStatus["ACTIVE"] = "ACTIVE";
    ProjectStatus["ON_HOLD"] = "ON_HOLD";
    ProjectStatus["COMPLETED"] = "COMPLETED";
    ProjectStatus["CANCELLED"] = "CANCELLED";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var PRStatus;
(function (PRStatus) {
    PRStatus["DRAFT"] = "DRAFT";
    PRStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    PRStatus["APPROVED"] = "APPROVED";
    PRStatus["REJECTED"] = "REJECTED";
    PRStatus["CANCELLED"] = "CANCELLED";
    PRStatus["ORDERED"] = "ORDERED";
})(PRStatus || (exports.PRStatus = PRStatus = {}));
var Language;
(function (Language) {
    Language["AR"] = "ar";
    Language["EN"] = "en";
})(Language || (exports.Language = Language = {}));
//# sourceMappingURL=index.js.map