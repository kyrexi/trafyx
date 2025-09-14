"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TestCase } from "@/types/test-case.type";
import { Clock, User, Globe, ChevronRight, BrainCog, Brain } from "lucide-react";
import { FaGolang } from "react-icons/fa6";
import { useState } from "react";
import { EditTestCaseButton, DeleteTestCaseButton } from "./test-case-actions";

const getMethodColor = (method: TestCase['method']) => {
    const methodName = method.toLowerCase();
    switch (methodName) {
        case 'get':
            return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'post':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        case 'put':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
        case 'patch':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
        case 'delete':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
};

const getStatusColor = (expectedOutcome: number) => {
    if (expectedOutcome >= 200 && expectedOutcome < 300) {
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    } else if (expectedOutcome >= 400 && expectedOutcome < 500) {
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    } else if (expectedOutcome >= 500) {
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
};

const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return 'Invalid date';
    }
};

const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
};

export default function TestCaseCard({ testCase }: { testCase: TestCase }) {
    const [isPayloadOpen, setIsPayloadOpen] = useState(false);
    const [isHeadersOpen, setIsHeadersOpen] = useState(false);

    const hasPayload = !!testCase.payload
    const hasHeaders = !!testCase.headers
    // const hasPayload = !!testCase.payload && testCase.payload !== "null" && !!testCase.payload.length && testCase.payload !== "{}";
    // const hasHeaders = !!testCase.headers && testCase.headers !== "null" && !!testCase.headers.length && testCase.headers !== "{}";

    const CreatedByIcon = () => {
        if (testCase.created_by === "go") {
            return <FaGolang size={22} />;
        } else if (testCase.created_by === "user") {
            return <User size={22} />;
        } else if (testCase.created_by === "ai") {
            return <BrainCog size={22} />;
        }
    }

    return (
        <Card className="w-full transition-all duration-200 hover:shadow-lg hover:border-foreground/20 dark:hover:border-foreground/30 group">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold leading-tight truncate">
                            {testCase.name}
                        </CardTitle>
                        {testCase.description && (
                            <CardDescription className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {testCase.description}
                            </CardDescription>
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-1 items-end">
                        <Badge variant="outline" className={getMethodColor(testCase.method)}>
                            {testCase.method.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(testCase.expected_outcome)}>
                            {testCase.expected_outcome}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="space-y-3">
                    {/* URL */}
                    <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-muted-foreground font-mono truncate" title={testCase.url}>
                            {truncateUrl(testCase.url)}
                        </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between w-full h-8">
                        <div className="flex items-center gap-2  text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(testCase.created_at)}</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <CreatedByIcon />
                            </div>
                        </div>

                        <div className="hidden group-hover:flex items-center gap-2">
                            <EditTestCaseButton testCase={testCase} />
                            <DeleteTestCaseButton testCaseId={testCase._id} />
                        </div>
                    </div>

                    {/* Collapsible Payload and Headers */}
                    <div className="">
                        {hasPayload && (
                            <Collapsible open={isPayloadOpen} onOpenChange={setIsPayloadOpen}>
                                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors">
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground ${isPayloadOpen ? 'rotate-90' : ''} transition-transform duration-200`} />
                                    <span className="text-sm font-medium text-foreground">Payload</span>
                                    <Badge variant="secondary" className="text-xs ml-auto">
                                        JSON
                                    </Badge>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="pl-6 pr-2 pb-2">
                                        <pre className="bg-muted/50 dark:bg-muted/20 p-3 rounded-md overflow-x-auto text-xs border">
                                            <code className="text-foreground">{testCase.payload}</code>
                                        </pre>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {hasHeaders && (
                            <Collapsible open={isHeadersOpen} onOpenChange={setIsHeadersOpen}>
                                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors">
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground ${isHeadersOpen ? 'rotate-90' : ''} transition-transform duration-200`} />
                                    <span className="text-sm font-medium text-foreground">Headers</span>
                                    <Badge variant="secondary" className="text-xs ml-auto">
                                        JSON
                                    </Badge>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="pl-6 pr-2 pb-2">
                                        <pre className="bg-muted/50 dark:bg-muted/20 p-3 rounded-md overflow-x-auto text-xs border">
                                            <code className="text-foreground">{testCase.headers}</code>
                                        </pre>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}