/**
 * 距離計算機能のテストスイート
 * Test suite for distance calculation functionality
 */

// Create a test version of the controller with only the distance calculation methods
class TestController {
    // Haversine distance calculation between two points
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Calculate total distance from array of locations
    calculateTotalDistance(locations) {
        if (!locations || locations.length < 2) return 0;
        
        let total = 0;
        for (let i = 1; i < locations.length; i++) {
            total += this.calculateDistance(
                locations[i-1].latitude, locations[i-1].longitude,
                locations[i].latitude, locations[i].longitude
            );
        }
        return total;
    }

    // Convert degrees to radians
    toRad(value) {
        return value * Math.PI / 180;
    }
}

describe('Distance Calculation', () => {
    let controller;
    
    beforeEach(() => {
        controller = new TestController();
    });

    describe('calculateDistance - Haversine Formula', () => {
        test('正確な距離計算 - 東京駅から新宿駅', () => {
            // 東京駅: 35.6812, 139.7671
            // 新宿駅: 35.6896, 139.7006
            // 実際の距離: 約6.4km
            const distance = controller.calculateDistance(
                35.6812, 139.7671,  // 東京駅
                35.6896, 139.7006   // 新宿駅
            );
            
            // 誤差範囲内での検証（±0.5km）
            expect(distance).toBeGreaterThan(5.9);
            expect(distance).toBeLessThan(6.9);
        });

        test('短距離の計算精度', () => {
            // 100m程度の短い距離
            const distance = controller.calculateDistance(
                35.6812, 139.7671,
                35.6821, 139.7681
            );
            
            // 約140m程度（誤差を考慮）
            expect(distance).toBeGreaterThan(0.1);
            expect(distance).toBeLessThan(0.2);
        });

        test('同じ座標の場合は距離0', () => {
            const distance = controller.calculateDistance(
                35.6812, 139.7671,
                35.6812, 139.7671
            );
            
            expect(distance).toBe(0);
        });

        test('長距離の計算 - 東京から大阪', () => {
            // 東京: 35.6762, 139.6503
            // 大阪: 34.6937, 135.5023
            // 実際の距離: 約400km
            const distance = controller.calculateDistance(
                35.6762, 139.6503,  // 東京
                34.6937, 135.5023   // 大阪
            );
            
            // 誤差範囲内での検証（±50km）
            expect(distance).toBeGreaterThan(350);
            expect(distance).toBeLessThan(450);
        });

        test('負の座標での計算', () => {
            // ブラジル・サンパウロ: -23.5505, -46.6333
            // アルゼンチン・ブエノスアイレス: -34.6118, -58.3960
            const distance = controller.calculateDistance(
                -23.5505, -46.6333,
                -34.6118, -58.3960
            );
            
            // 約1200km程度
            expect(distance).toBeGreaterThan(1100);
            expect(distance).toBeLessThan(1300);
        });

        test('赤道を跨ぐ距離計算', () => {
            // シンガポール: 1.3521, 103.8198
            // ジャカルタ: -6.2088, 106.8456
            const distance = controller.calculateDistance(
                1.3521, 103.8198,   // シンガポール
                -6.2088, 106.8456   // ジャカルタ
            );
            
            // 約900km程度
            expect(distance).toBeGreaterThan(800);
            expect(distance).toBeLessThan(1000);
        });
    });

    describe('calculateTotalDistance - Cumulative Distance', () => {
        test('複数地点の累積距離計算', () => {
            const locations = [
                { latitude: 35.6812, longitude: 139.7671 }, // 東京駅
                { latitude: 35.6896, longitude: 139.7006 }, // 新宿駅
                { latitude: 35.7090, longitude: 139.7319 }, // 池袋駅
                { latitude: 35.7295, longitude: 139.7164 }  // 上野駅
            ];
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // 各区間の距離の合計になる（約15-25km程度）
            expect(totalDistance).toBeGreaterThan(10);
            expect(totalDistance).toBeLessThan(30);
        });

        test('2地点の場合の距離計算', () => {
            const locations = [
                { latitude: 35.6812, longitude: 139.7671 },
                { latitude: 35.6896, longitude: 139.7006 }
            ];
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // 単一区間の距離（約6.4km）
            expect(totalDistance).toBeGreaterThan(5.9);
            expect(totalDistance).toBeLessThan(6.9);
        });

        test('1地点のみの場合は距離0', () => {
            const locations = [
                { latitude: 35.6812, longitude: 139.7671 }
            ];
            
            const totalDistance = controller.calculateTotalDistance(locations);
            expect(totalDistance).toBe(0);
        });

        test('空配列の場合は距離0', () => {
            const totalDistance = controller.calculateTotalDistance([]);
            expect(totalDistance).toBe(0);
        });

        test('nullまたはundefinedの場合は距離0', () => {
            expect(controller.calculateTotalDistance(null)).toBe(0);
            expect(controller.calculateTotalDistance(undefined)).toBe(0);
        });

        test('順序の違いで距離が変わることを確認', () => {
            const locationsA = [
                { latitude: 35.6812, longitude: 139.7671 }, // 東京駅
                { latitude: 35.6896, longitude: 139.7006 }, // 新宿駅
                { latitude: 35.7090, longitude: 139.7319 }  // 池袋駅
            ];
            
            const locationsB = [
                { latitude: 35.6812, longitude: 139.7671 }, // 東京駅
                { latitude: 35.7090, longitude: 139.7319 }, // 池袋駅
                { latitude: 35.6896, longitude: 139.7006 }  // 新宿駅
            ];
            
            const distanceA = controller.calculateTotalDistance(locationsA);
            const distanceB = controller.calculateTotalDistance(locationsB);
            
            // 経路が違うので距離も変わる
            expect(distanceA).not.toBe(distanceB);
        });

        test('山手線一周のシミュレーション', () => {
            // 山手線の主要駅の座標
            const yamanoteStations = [
                { latitude: 35.6812, longitude: 139.7671 }, // 東京
                { latitude: 35.6852, longitude: 139.7409 }, // 有楽町
                { latitude: 35.6896, longitude: 139.7006 }, // 新宿
                { latitude: 35.7295, longitude: 139.7164 }, // 上野
                { latitude: 35.7090, longitude: 139.7319 }, // 池袋
                { latitude: 35.6585, longitude: 139.7454 }, // 品川
                { latitude: 35.6266, longitude: 139.7236 }, // 目黒
                { latitude: 35.6580, longitude: 139.7016 }  // 渋谷
            ];
            
            const totalDistance = controller.calculateTotalDistance(yamanoteStations);
            
            // 山手線の実際の距離は約34.5km
            // 主要駅のみなので20-40km程度を期待
            expect(totalDistance).toBeGreaterThan(15);
            expect(totalDistance).toBeLessThan(50);
        });
    });

    describe('toRad - Degree to Radian Conversion', () => {
        test('0度のラジアン変換', () => {
            expect(controller.toRad(0)).toBe(0);
        });

        test('90度のラジアン変換', () => {
            const result = controller.toRad(90);
            expect(result).toBeCloseTo(Math.PI / 2, 10);
        });

        test('180度のラジアン変換', () => {
            const result = controller.toRad(180);
            expect(result).toBeCloseTo(Math.PI, 10);
        });

        test('360度のラジアン変換', () => {
            const result = controller.toRad(360);
            expect(result).toBeCloseTo(2 * Math.PI, 10);
        });

        test('負の角度のラジアン変換', () => {
            const result = controller.toRad(-90);
            expect(result).toBeCloseTo(-Math.PI / 2, 10);
        });

        test('小数点を含む角度のラジアン変換', () => {
            const result = controller.toRad(45.5);
            expect(result).toBeCloseTo((45.5 * Math.PI) / 180, 10);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('極値の緯度経度での計算', () => {
            // 北極と南極
            const distance = controller.calculateDistance(
                90, 0,    // 北極
                -90, 180  // 南極
            );
            
            // 地球の半周距離（約20,000km）
            expect(distance).toBeGreaterThan(19000);
            expect(distance).toBeLessThan(21000);
        });

        test('NaNが含まれる座標での処理', () => {
            const distance = controller.calculateDistance(
                NaN, 139.7671,
                35.6896, 139.7006
            );
            
            // NaNを含む計算結果はNaN
            expect(distance).toBeNaN();
        });

        test('無限大が含まれる座標での処理', () => {
            const distance = controller.calculateDistance(
                Infinity, 139.7671,
                35.6896, 139.7006
            );
            
            // Infinityを含む計算結果はNaN
            expect(distance).toBeNaN();
        });

        test('不正な座標データを含む locations 配列', () => {
            const locations = [
                { latitude: 35.6812, longitude: 139.7671 },
                { latitude: NaN, longitude: 139.7006 },      // NaN座標
                { latitude: 35.7090, longitude: 139.7319 }
            ];
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // NaNが含まれるためNaN
            expect(totalDistance).toBeNaN();
        });

        test('座標データが不完全な locations 配列', () => {
            const locations = [
                { latitude: 35.6812, longitude: 139.7671 },
                { latitude: 35.6896 },  // longitudeが欠損
                { latitude: 35.7090, longitude: 139.7319 }
            ];
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // undefinedが含まれるためNaN
            expect(totalDistance).toBeNaN();
        });

        test('極端に大きな座標値での計算', () => {
            // 地球の座標範囲を超える値
            const distance = controller.calculateDistance(
                1000, 1000,
                -1000, -1000
            );
            
            // 結果は数値として返される（実際の地球上の地点ではないが）
            expect(typeof distance).toBe('number');
            expect(distance).toBeFinite();
        });
    });

    describe('Performance and Precision Tests', () => {
        test('大量の地点での計算パフォーマンス', () => {
            // 1000地点のランダムな座標を生成（東京周辺）
            const locations = [];
            for (let i = 0; i < 1000; i++) {
                locations.push({
                    latitude: 35.6 + Math.random() * 0.2,   // 35.6-35.8
                    longitude: 139.7 + Math.random() * 0.2  // 139.7-139.9
                });
            }
            
            const startTime = performance.now();
            const totalDistance = controller.calculateTotalDistance(locations);
            const endTime = performance.now();
            
            // 計算時間が妥当な範囲内（1秒以下）
            const calculationTime = endTime - startTime;
            expect(calculationTime).toBeLessThan(1000);
            
            // 結果が妥当な範囲内（東京周辺での1000点なので数百km程度）
            expect(totalDistance).toBeGreaterThan(0);
            expect(totalDistance).toBeLessThan(1000); // 1000km以下
        });

        test('高精度小距離の計算', () => {
            // 非常に近い2点間の距離（メートル単位）
            const distance = controller.calculateDistance(
                35.681200, 139.767100,  // 基準点
                35.681201, 139.767101   // 1m程度の差
            );
            
            // 約1.4m程度（誤差を考慮して0.5-5m）
            expect(distance).toBeGreaterThan(0.0005);
            expect(distance).toBeLessThan(0.005);
        });

        test('連続する同一座標での距離計算', () => {
            const locations = [];
            // 同じ座標を10回繰り返し
            for (let i = 0; i < 10; i++) {
                locations.push({ latitude: 35.6812, longitude: 139.7671 });
            }
            
            const totalDistance = controller.calculateTotalDistance(locations);
            expect(totalDistance).toBe(0);
        });
    });

    describe('Real-world Walking Session Simulation', () => {
        test('30分ウォーキングセッションの距離計算シミュレーション', () => {
            // 30分間のウォーキング（1分毎に位置記録）
            // 平均時速4kmで歩いた場合、約2kmの距離
            const startLat = 35.6812;
            const startLon = 139.7671;
            const locations = [];
            
            // 直線的に移動するシミュレーション（30ポイント）
            for (let i = 0; i < 30; i++) {
                locations.push({
                    latitude: startLat + (i * 0.0005), // 北に徐々に移動
                    longitude: startLon + (i * 0.0005) // 東に徐々に移動
                });
            }
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // 約2km程度の妥当な距離
            expect(totalDistance).toBeGreaterThan(1.5);
            expect(totalDistance).toBeLessThan(3.0);
        });

        test('GPS精度の低い環境でのノイズ耐性', () => {
            // GPS精度が低い環境をシミュレーション（ランダムな微小変動）
            const baseLat = 35.6812;
            const baseLon = 139.7671;
            const locations = [];
            
            for (let i = 0; i < 10; i++) {
                locations.push({
                    // ±10m程度のランダムな誤差を追加
                    latitude: baseLat + (Math.random() - 0.5) * 0.0001,
                    longitude: baseLon + (Math.random() - 0.5) * 0.0001
                });
            }
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // ノイズによる距離は比較的小さい（1km以下）
            expect(totalDistance).toBeLessThan(1.0);
            expect(totalDistance).toBeGreaterThanOrEqual(0);
        });

        test('停止状態（同じ場所での待機）のシミュレーション', () => {
            // 信号待ちなどで同じ場所に5分間滞在
            const locations = [];
            for (let i = 0; i < 5; i++) {
                locations.push({ latitude: 35.6812, longitude: 139.7671 });
            }
            
            // その後移動開始
            for (let i = 0; i < 10; i++) {
                locations.push({
                    latitude: 35.6812 + (i * 0.0003),
                    longitude: 139.7671 + (i * 0.0003)
                });
            }
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // 移動部分のみの距離（約0.5-1km）
            expect(totalDistance).toBeGreaterThan(0.3);
            expect(totalDistance).toBeLessThan(1.5);
        });

        test('往復ルートでの距離計算', () => {
            const locations = [
                { latitude: 35.6812, longitude: 139.7671 }, // 開始点
                { latitude: 35.6850, longitude: 139.7700 }, // 中間点1
                { latitude: 35.6900, longitude: 139.7750 }, // 最遠点
                { latitude: 35.6850, longitude: 139.7700 }, // 中間点1（復路）
                { latitude: 35.6812, longitude: 139.7671 }  // 開始点（復路）
            ];
            
            const totalDistance = controller.calculateTotalDistance(locations);
            
            // 往復なので直線距離の約2倍程度
            const directDistance = controller.calculateDistance(
                35.6812, 139.7671,
                35.6900, 139.7750
            );
            
            // 往復 + 経由地なので直線距離の2倍以上
            expect(totalDistance).toBeGreaterThan(directDistance * 1.8);
            expect(totalDistance).toBeLessThan(directDistance * 2.5);
        });
    });

    describe('Mathematical Edge Cases', () => {
        test('日付変更線を跨ぐ距離計算', () => {
            // 東経179度と西経179度（日付変更線付近）
            const distance = controller.calculateDistance(
                35.0, 179.0,   // 太平洋西側
                35.0, -179.0   // 太平洋東側
            );
            
            // 約220km程度（短い方の経路）
            expect(distance).toBeGreaterThan(200);
            expect(distance).toBeLessThan(250);
        });

        test('本初子午線を跨ぐ距離計算', () => {
            // 東経1度と西経1度（本初子午線付近）
            const distance = controller.calculateDistance(
                51.0, 1.0,    // イギリス東側
                51.0, -1.0    // イギリス西側
            );
            
            // 約140km程度
            expect(distance).toBeGreaterThan(130);
            expect(distance).toBeLessThan(150);
        });
    });
});