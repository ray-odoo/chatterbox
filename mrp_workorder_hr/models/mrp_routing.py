# -*- coding: utf-8 -*-
from odoo import models, fields


class MrpRouting(models.Model):
    _inherit = 'mrp.routing.workcenter'

    employee_ratio = fields.Float("Employee Capacity", help="Number of employee needed to produce one batch")
