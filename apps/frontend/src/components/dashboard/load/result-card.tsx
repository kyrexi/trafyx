import React from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/loader";
import {
    Clock,
    Zap,
    Target,
    Activity,
    CheckCircle,
    XCircle,
    Download,
    Upload,
    BarChart3,
    Timer,
    TrendingUp,
} from "lucide-react";
import { LoadTestResponse } from "@/types/load-test.type";
import MetricCard from "./metric-card";

interface LoadTestResultsProps {
    data: LoadTestResponse | null;
    isLoading: boolean;
    error: any;
}

export default function LoadTestResults({ data, isLoading, error }: LoadTestResultsProps) {
    if (!data && !isLoading && !error) return null;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (value: string | number) => {
        const valueStr = value.toString();
        
        // Check if the string contains 'ms' or 's' suffix
        const msMatch = valueStr.match(/^([\d.]+)\s*ms$/i);
        const sMatch = valueStr.match(/^([\d.]+)\s*s$/i);
        
        if (msMatch) {
            // Value already has 'ms' unit
            return { value: parseFloat(msMatch[1]).toFixed(2), unit: 'ms' };
        } else if (sMatch) {
            // Value already has 's' unit
            return { value: parseFloat(sMatch[1]).toFixed(2), unit: 's' };
        } else {
            // No unit found, parse as number and infer
            const numValue = parseFloat(valueStr);
            // If value is large (> 100), assume milliseconds, otherwise seconds
            if (numValue > 100 || (numValue > 10 && numValue < 100)) {
                return { value: numValue.toFixed(2), unit: 'ms' };
            } else {
                return { value: numValue.toFixed(2), unit: 's' };
            }
        }
    };

    const getLatencyVariant = (latency: string | number): 'success' | 'default' | 'warning' | 'danger' => {
        const time = formatTime(latency);
        const value = parseFloat(time.value);
        const inSeconds = time.unit === 's' ? value : value / 1000;

        if (inSeconds < 0.2) return 'success';      // < 200ms - green
        if (inSeconds < 0.5) return 'default';      // < 500ms - gray
        if (inSeconds < 1.0) return 'warning';      // < 1s - orange
        return 'danger';                             // >= 1s - red
    };

    const getStatusCodeColor = (code: string) => {
        const statusCode = parseInt(code);
        if (statusCode >= 200 && statusCode < 300) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
        if (statusCode >= 300 && statusCode < 400) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
        if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Load Test Results
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 py-4">
                        <XCircle className="h-5 w-5" />
                        <span>Error running load test</span>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* API Name and Success Rate */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                {data.api_name}
                            </h3>
                            <Badge
                                variant={data.success === 1 ? "default" : "destructive"}
                                className="flex items-center gap-1"
                            >
                                {data.success === 1 ? (
                                    <CheckCircle className="h-3 w-3" />
                                ) : (
                                    <XCircle className="h-3 w-3" />
                                )}
                                {(data.success * 100).toFixed(1)}% Success
                            </Badge>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                            <MetricCard
                                icon={<Zap className="size-4" />}
                                label="Requests"
                                value={data.requests}
                                variant="primary"
                                size="sm"
                            />
                            <MetricCard
                                icon={<TrendingUp className="size-4" />}
                                label="Throughput"
                                value={data.throughput.toFixed(1)}
                                suffix="/sec"
                                variant="default"
                                size="sm"
                            />
                            <MetricCard
                                icon={<Clock className="size-4" />}
                                label="Duration"
                                value={formatTime(data.duration).value}
                                suffix={formatTime(data.duration).unit}
                                variant="default"
                                size="sm"
                            />
                            <MetricCard
                                icon={<Timer className="size-4" />}
                                label="Avg Wait"
                                value={formatTime(data.wait).value}
                                suffix={formatTime(data.wait).unit}
                                variant="default"
                                size="sm"
                            />
                        </div>

                        {/* Latencies */}
                        <div>
                            <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-foreground">
                                <Activity className="size-4" />
                                Response Times
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                <MetricCard
                                    icon={null}
                                    label="Mean"
                                    value={formatTime(data.latencies.mean).value}
                                    suffix={formatTime(data.latencies.mean).unit}
                                    variant={getLatencyVariant(data.latencies.mean)}
                                    size="sm"
                                />
                                <MetricCard
                                    icon={null}
                                    label="50th Percentile"
                                    value={formatTime(data.latencies.p50).value}
                                    suffix={formatTime(data.latencies.p50).unit}
                                    variant={getLatencyVariant(data.latencies.p50)}
                                    size="sm"
                                />
                                <MetricCard
                                    icon={null}
                                    label="95th Percentile"
                                    value={formatTime(data.latencies.p95).value}
                                    suffix={formatTime(data.latencies.p95).unit}
                                    variant={getLatencyVariant(data.latencies.p95)}
                                    size="sm"
                                />
                                <MetricCard
                                    icon={null}
                                    label="99th Percentile"
                                    value={formatTime(data.latencies.p99).value}
                                    suffix={formatTime(data.latencies.p99).unit}
                                    variant={getLatencyVariant(data.latencies.p99)}
                                    size="sm"
                                />
                            </div>
                        </div>

                        {/* Status Codes */}
                        <div>
                            <h4 className="text-md font-semibold mb-3 text-foreground">Status Codes</h4>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(data.status_codes).map(([code, count]) => (
                                    <div
                                        key={code}
                                        className={`${getStatusCodeColor(code)} w-fit h-8 flex items-center justify-center border px-2 py-1 rounded-md text-sm font-medium`}
                                    >
                                        {code}: {count}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Data Transfer */}
                        <div>
                            <h4 className="text-md font-semibold mb-3 text-foreground">Data Transfer</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/50 p-3 rounded-lg border dark:border-green-800/50">
                                    <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    <div>
                                        <div className="text-sm text-green-600 dark:text-green-400">Downloaded</div>
                                        <div className="font-semibold text-green-900 dark:text-green-100">
                                            {formatBytes(data.data.bytes_in_total)}
                                        </div>
                                        <div className="text-xs text-green-600 dark:text-green-400">
                                            {formatBytes(data.data.bytes_in)} avg/req
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border dark:border-red-800/50">
                                    <Upload className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    <div>
                                        <div className="text-sm text-red-600 dark:text-red-400">Uploaded</div>
                                        <div className="font-semibold text-red-900 dark:text-red-100">
                                            {formatBytes(data.data.bytes_out_total)}
                                        </div>
                                        <div className="text-xs text-red-600 dark:text-red-400">
                                            {formatBytes(data.data.bytes_out)} avg/req
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Errors */}
                        {data.errors && data.errors > 0 && (
                            <div>
                                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-red-600">
                                    <XCircle className="size-4" />
                                    Errors ({data.errors})
                                </h4>
                                {data.error ? (
                                    <div className="text-red-600">
                                        <p>{data.error}</p>
                                        {data.details && <p className="text-xs text-gray-500">{data.details}</p>}
                                    </div>
                                ) : (
                                    <div className="text-gray-600">No specific error details available.</div>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}