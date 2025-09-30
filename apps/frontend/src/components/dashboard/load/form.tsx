"use client";

import { useState } from "react";
import { useUserAPIs } from "@/hooks/use-user-apis";
import { useLoadTest } from "@/hooks/use-load-test";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import Loader from "@/components/ui/loader";
import LoadTestResults from "./result-card";

const formSchema = z.object({
    apiId: z.string().min(1, "API must be selected"),
    payload: z.string().optional(),
    headers: z.string().optional(),
    rate: z
        .number()
        .min(1, "Rate must be at least 1")
        .max(100, "Rate must be ≤ 100"),
    time: z.number().min(1, "Time must be at least 1").max(15, "Time must be ≤ 15"),
});

export default function LoadTestForm({ userId }: { userId: string }) {
    const { data: apiData, isLoading, error } = useUserAPIs({ userId });
    const { loadTest, isLoading: isSubmitting, data: loadTestData, error: submitError } = useLoadTest();
    const [selectedApiId, setSelectedApiId] = useState<string>("");
    const [payload, setPayload] = useState<string>("");
    const [headers, setHeaders] = useState<string>("");
    const [rate, setRate] = useState<number>(1);
    const [time, setTime] = useState<number>(5);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error loading APIs</p>;

    const isFormDisabled = !selectedApiId;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrors({});
        const result = formSchema.safeParse({
            apiId: selectedApiId,
            payload,
            headers,
            rate,
            time,
        });
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error?.issues?.forEach(err => {
                if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
            });
            setErrors(fieldErrors);
            return;
        }
        loadTest({
            api_id: selectedApiId,
            rate,
            duration: time,
            payload: payload ? payload : null,
            headers: headers ? headers : null,
        });
    }

    return (
        <main className="mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Column */}
                <div className="space-y-4">
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>Configure Load Test</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <Label htmlFor="api-select">Select API</Label>
                                    <Select
                                        value={selectedApiId}
                                        onValueChange={setSelectedApiId}
                                    >
                                        <SelectTrigger id="api-select" className="mt-2 w-full py-8">
                                            <SelectValue placeholder="Choose an API" />
                                        </SelectTrigger>
                                        <SelectContent className="w-full">
                                            {apiData?.apis?.map(api => (
                                                <SelectItem key={api.id} value={api.id} className="w-full p-2">
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="uppercase px-1 py-0.5">{api.method}</Badge>
                                                            <span className="font-medium">{api.name}</span>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground break-all">{api.url}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.apiId && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {errors.apiId}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="payload">Payload (JSON)</Label>
                                    <Textarea
                                        id="payload"
                                        value={payload}
                                        onChange={e => setPayload(e.target.value)}
                                        placeholder='{"key": "value"}'
                                        className="mt-2"
                                        rows={4}
                                        disabled={isFormDisabled}
                                    />
                                    {errors.payload && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {errors.payload}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="headers">Headers (JSON)</Label>
                                    <Textarea
                                        id="headers"
                                        value={headers}
                                        onChange={e => setHeaders(e.target.value)}
                                        placeholder='{"Authorization": "Bearer ..."}'
                                        className="mt-2"
                                        rows={3}
                                        disabled={isFormDisabled}
                                    />
                                    {errors.headers && (
                                        <div className="text-xs text-red-500 mt-1">
                                            {errors.headers}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    * Params and headers are optional. If left blank, the values
                                    stored in the database will be used.
                                </div>
                                <div className="flex space-x-4">
                                    <div className="flex-1">
                                        <Label htmlFor="rate">Rate (requests/sec)</Label>
                                        <Input
                                            id="rate"
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={rate}
                                            onChange={e => setRate(Number(e.target.value))}
                                            className="mt-2"
                                            disabled={isFormDisabled}
                                        />
                                        {errors.rate && (
                                            <div className="text-xs text-red-500 mt-1">
                                                {errors.rate}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Label htmlFor="time">Time (seconds)</Label>
                                        <Input
                                            id="time"
                                            type="number"
                                            min={1}
                                            max={15}
                                            value={time}
                                            onChange={e => setTime(Number(e.target.value))}
                                            className="mt-2"
                                            disabled={isFormDisabled}
                                        />
                                        {errors.time && (
                                            <div className="text-xs text-red-500 mt-1">
                                                {errors.time}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <CardFooter className="p-0">
                                    <Button
                                        variant={"default"}
                                        type="submit"
                                        className="w-full mt-4"
                                        disabled={isFormDisabled || isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader />
                                                Running Test...
                                            </>
                                        ) : (
                                            "Start Load Test"
                                        )}
                                    </Button>
                                </CardFooter>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Column */}
                <div className="space-y-4">
                    <LoadTestResults
                        data={loadTestData}
                        isLoading={isSubmitting}
                        error={submitError}
                    />
                </div>
            </div>
        </main>
    );
}