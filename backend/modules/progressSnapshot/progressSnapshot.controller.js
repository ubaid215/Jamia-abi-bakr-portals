const snapshotService = require('./progressSnapshot.service');
const logger = require('../../utils/logger');

class ProgressSnapshotController {

    // GET /api/dashboard/student/:studentId
    async getSnapshot(req, res) {
        try {
            const { studentId } = req.params;
            const snapshot = await snapshotService.getSnapshot(studentId);
            res.json({ success: true, data: snapshot });
        } catch (error) {
            logger.error({ err: error }, 'Get snapshot error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // POST /api/dashboard/recalculate/:studentId
    async recalculate(req, res) {
        try {
            const { studentId } = req.params;
            const snapshot = await snapshotService.recalculate(studentId);
            res.json({ success: true, data: snapshot });
        } catch (error) {
            logger.error({ err: error }, 'Recalculate snapshot error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // POST /api/dashboard/bulk-recalculate
    async bulkRecalculate(req, res) {
        try {
            const { classRoomId } = req.body;
            if (!classRoomId) {
                return res.status(400).json({ success: false, error: 'classRoomId is required' });
            }

            const results = await snapshotService.bulkRecalculate(classRoomId);
            const succeeded = results.filter((r) => r.success).length;
            const failed = results.filter((r) => !r.success).length;

            res.json({
                success: true,
                data: { total: results.length, succeeded, failed, results },
            });
        } catch (error) {
            logger.error({ err: error }, 'Bulk recalculate error');
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // GET /api/dashboard/at-risk
    async getAtRisk(req, res) {
        try {
            const { riskLevel, page, limit } = req.query;
            const result = await snapshotService.getAtRiskStudents({
                riskLevel,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            });
            res.json({ success: true, ...result });
        } catch (error) {
            logger.error({ err: error }, 'Get at-risk error');
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ProgressSnapshotController();
