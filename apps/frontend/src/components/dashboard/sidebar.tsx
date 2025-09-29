"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    BarChart2,
    Settings,
    LogOut,
    ChevronsLeft,
    PlusCircleIcon,
    NotepadText,
    DumbbellIcon,
    Cog,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Separator } from "../ui/separator";

export function AppSidebar() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { toggleSidebar } = useSidebar();
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    // function to change the theme, on click of the button
    const handleThemeChange = () => {
        //    The theme will change in the order: light -> dark -> system
        if (theme === "light") {
            setTheme("dark");
        } else {
            setTheme("light");
        }
    };

    return (
        <Sidebar variant="floating" collapsible="icon" className="">
            <SidebarHeader>
                <Link
                    href="/"
                    className="flex items-center justify-start py-2 gap-2 flex-row w-full"
                >
                    <div className="bg-primary rounded-full shadow-xl text-white p-1">
                        <Cog className="size-6" />
                    </div>
                    {isSidebarOpen && (
                        <AnimatePresence>
                            <motion.span
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-bold"
                            >
                                Trafyx
                            </motion.span>
                        </AnimatePresence>
                    )}
                </Link>
            </SidebarHeader>
            <Separator className="mb-3" />
            <SidebarContent className="px-2">
                <SidebarMenu className="">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Add new API"
                            isActive={pathname.includes("/dashboard/add")}
                            asChild
                            className="flex items-center"
                        >
                            <Link href="/dashboard/add">
                                <PlusCircleIcon className="h-4 w-4" />
                                <span>Add new API</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>{" "}
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Create & Run Load Tests"
                            isActive={pathname.includes("/dashboard/load")}
                            asChild
                            className="flex items-center"
                        >
                            <Link href="/dashboard/load">
                                <DumbbellIcon className="h-4 w-4" />
                                <span>Load Test APIs</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="View All APIs"
                            isActive={pathname.includes("/dashboard/apis")}
                            asChild
                            className="flex items-center"
                        >
                            <Link href="/dashboard/apis">
                                <BarChart2 className="h-4 w-4" />
                                <span>View All APIs</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="See Test Results"
                            isActive={pathname.includes("/dashboard/results")}
                            asChild
                            className="flex items-center"
                        >
                            <Link href="/dashboard/results">
                                <NotepadText className="h-4 w-4" />
                                <span>API Test Results</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                </SidebarMenu>
            </SidebarContent>
            <Separator />
            <SidebarFooter>
                <SidebarMenu>
                    {/* <SidebarMenuItem className="border-t border-t-neutral-700/30 dark:border-t-white/20">
                        <Link href={`/docs${PageRoutes[0].href}`} target="_blank">
                            <SidebarMenuButton tooltip="View Documentation">
                                <NotebookTextIcon className="h-4 w-4" />{" "}
                                <span>View Documentation</span>
                                <ArrowUpRight className="h-1 w-1" />
                            </SidebarMenuButton>
                        </Link>{" "}
                    </SidebarMenuItem> */}
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Change Theme" onClick={handleThemeChange} className="flex items-center">
                            {theme === "dark" ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                            <span>Change Theme</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Settings"
                            isActive={pathname.includes("/dashboard/settings")}
                            asChild
                            className="flex items-center"
                        >
                            <Link href="/dashboard/settings">
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem> */}
                    <SidebarMenuItem className="">
                        <SidebarMenuButton
                            tooltip="Expand Sidebar"
                            onClick={() => {
                                toggleSidebar();
                                setIsSidebarOpen(!isSidebarOpen);
                            }}
                        // className="flex items-center justify-center w-full"
                        >
                            <ChevronsLeft
                                className={`h-4 w-4 ${isSidebarOpen ? "" : "transform rotate-180"
                                    } transition-transform duration-300`}
                            />
                            <span>Collapse Sidebar</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        {/* <ThemeToggle /> */}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Logout"
                            onClick={async () => {
                                await authClient.signOut();
                                router.push("/auth/login");
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
