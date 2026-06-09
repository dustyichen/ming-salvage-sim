import tempfile
import unittest

from ming_sim.content import GameContent
from ming_sim.db import GameDB
from ming_sim.flows import apply_fixed_period_flows


class ArmsAndTroopsTests(unittest.TestCase):
    def setUp(self):
        self.content = GameContent.load()
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db")
        self.db = GameDB(self.tmp.name, self.content)
        self.db.seed_static_data()
        self.state = self.db.load_state()

    def tearDown(self):
        self.tmp.close()

    def test_opening_arms_stock_defaults(self):
        stock = {item["id"]: item for item in self.db.arms_stock_payload()}
        self.assertEqual(stock["huochong"]["qty"], 1200)
        self.assertEqual(stock["niaochong"]["qty"], 300)
        self.assertEqual(stock["sanyan_chong"]["qty"], 500)
        self.assertEqual(stock["hudun_pao"]["qty"], 40)
        self.assertEqual(stock["folangji"]["qty"], 12)
        self.assertFalse(stock["suifa_qiang"]["unlocked"])
        self.assertEqual(stock["suifa_qiang"]["qty"], 0)

    def test_opening_monthly_arms_production(self):
        flows = apply_fixed_period_flows(self.db, self.state)
        arms_flows = {
            (item["weapon"], item["building"]): item["amount"]
            for item in flows
            if item.get("dir") == "arms"
        }
        self.assertEqual(arms_flows[("huochong", "京营火器局")], 440)
        self.assertEqual(arms_flows[("folangji", "定海卫海防炮台")], 2)
        stock = {item["id"]: item["qty"] for item in self.db.arms_stock_payload()}
        self.assertEqual(stock["huochong"], 1640)
        self.assertEqual(stock["folangji"], 14)

    def test_army_payload_has_composition_and_computed_pay(self):
        army = next(item for item in self.db.army_payload() if item["id"] == "jingying")
        self.assertEqual(army["troop_composition"], {"步卒": 75000, "火器炮兵": 5000, "骑兵": 5000})
        self.assertEqual(army["manpower"], sum(army["troop_composition"].values()))
        self.assertEqual(army["maintenance_per_turn"], self.content.troop_maintenance_total(army["troop_composition"]))


if __name__ == "__main__":
    unittest.main()
