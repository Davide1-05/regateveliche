import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Mock data representing the output of the WRS algorithm
const MOCK_TACTICAL_DATA = {
  sailNumber: "ITA-12345",
  boatType: "J70",
  currentStatus: {
    elapsedTime: 3600,
    correctedTime: 3450,
    weatherFactor: 0.958,
    individualPET: 3789,
    referencePET: 2273,
  },
  currentWeather: {
    windSpeed: 12,
    windDirection: 180,
    waveHeight: 1.2,
    wavePeriod: 4.5,
  },
  routeSegments: [
    {
      id: 1,
      from: [41.1350, 9.5680],
      to: [41.1450, 9.5680],
      distanceNm: 1.8,
      bearingTrue: 0,
      windSpeedKnots: 12,
      windDirectionTrue: 180,
      twa: 90,
      predictedVm_knots: 7.5,
      heading: 45,
      legTimeSeconds: 288,
    },
    {
      id: 2,
      from: [41.1450, 9.5680],
      to: [41.1450, 9.5780],
      distanceNm: 1.2,
      bearingTrue: 90,
      windSpeedKnots: 13,
      windDirectionTrue: 175,
      twa: 85,
      predictedVm_knots: 8.2,
      heading: 60,
      legTimeSeconds: 263,
    },
    {
      id: 3,
      from: [41.1450, 9.5780],
      to: [41.1350, 9.5780],
      distanceNm: 1.8,
      bearingTrue: 180,
      windSpeedKnots: 11,
      windDirectionTrue: 190,
      twa: 100,
      predictedVm_knots: 7.0,
      heading: 120,
      legTimeSeconds: 308,
    },
  ],
};

const TacticalDashboardPage = () => {
  const [data, setData] = useState(MOCK_TACTICAL_DATA);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">{t('tacticalPage.title')}</h1>
            <p className="text-xs text-slate-400">{t('tacticalPage.realTimeWrsAnalysis')}</p>
          </div>
          <nav className="flex gap-4">
            <Link to="/dashboard" className="text-sm hover:text-cyan-400 transition-colors">{t('tacticalPage.mainDashboard')}</Link>
            <button onClick={() => { localStorage.removeItem('token');
                                     localStorage.removeItem('user'); 
                                     window.location.href = '/login'; }}
            className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700">{t('common.logout')}</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Summary */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-cyan-300">{t('tacticalPage.boatStatus', { sailNumber: data.sailNumber })}</h2>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-400">{t('tacticalPage.elapsedTime')}</span>
                <span className="font-mono text-xl">{new Date(data.currentStatus.elapsedTime * 1000).toISOString().substr(11, 8)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700 pb-2">
                <span className="text-slate-400">{t('tacticalPage.correctedTime')}</span>
                <span className="font-mono text-xl text-green-400">{new Date(data.currentStatus.correctedTime * 1000).toISOString().substr(11, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('tacticalPage.weatherFactor')}</span>
                <span className="font-bold">{data.currentStatus.weatherFactor.toFixed(3)}</span>
              </div>
            </div>
          </section>

          <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-cyan-300">{t('tacticalPage.currentConditions')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-xs text-slate-500 uppercase">{t('tacticalPage.windSpeed')}</p>
                <p className="text-xl font-bold">{data.currentWeather.windSpeed} kn</p>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-xs text-slate-500 uppercase">{t('tacticalPage.windDir')}</p>
                <p className="text-xl font-bold">{data.currentWeather.windDirection}°</p>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-xs text-slate-500 uppercase">{t('tacticalPage.waveHeight')}</p>
                <p className="text-xl font-bold">{data.currentWeather.waveHeight}m</p>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-xs text-slate-500 uppercase">{t('tacticalPage.wavePeriod')}</p>
                <p className="text-xl font-bold">{data.currentWeather.wavePeriod}s</p>
              </div>
            </div>
          </section>
        </div>

        {/* Route Analysis */}
        <div className="lg:col-span-2">
          <section className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl h-full">
            <h2 className="text-lg font-semibold mb-4 text-cyan-300">{t('tacticalPage.optimizedRouteSegments')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-sm">
                    <th className="p-2">{t('tacticalPage.leg')}</th>
                    <th className="p-2">{t('tacticalPage.distance')}</th>
                    <th className="p-2">{t('tacticalPage.bearing')}</th>
                    <th className="p-2">TWA</th>
                    <th className="p-2">{t('tacticalPage.optHeading')}</th>
                    <th className="p-2">{t('tacticalPage.vmgKn')}</th>
                    <th className="p-2">{t('tacticalPage.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.routeSegments.map((seg, idx) => (
                    <tr key={seg.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="p-2 text-cyan-400 font-bold">{idx + 1}</td>
                      <td className="p-2">{seg.distanceNm} nm</td>
                      <td className="p-2">{seg.bearingTrue}°</td>
                      <td className="p-2">{seg.twa}°</td>
                      <td className="p-2 text-green-400 font-bold">{seg.heading}°</td>
                      <td className="p-2">{seg.predictedVm_knots}</td>
                      <td className="p-2">{Math.floor(seg.legTimeSeconds / 60)}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 p-4 bg-cyan-900/20 border border-cyan-800 rounded-lg">
              <h3 className="text-sm font-bold text-cyan-400 mb-1">{t('tacticalPage.tacticalInsight')}</h3>
              <p className="text-xs text-slate-300">
                {t('tacticalPage.tacticalInsightText')}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TacticalDashboardPage;