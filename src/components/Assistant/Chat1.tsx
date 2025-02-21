import {useEffect, useState} from "react";
import {listen} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";
import {useConnectStore} from "@/stores/connectStore.ts";

function App() {
    const serverList = useConnectStore((state) => state.serverList);
    const setServerList = useConnectStore((state) => state.setServerList);

    const [activeServer, setActiveServer] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    function convertToWebSocket(endpoint) {
        // Create a URL object from the given endpoint string
        const url = new URL(endpoint);

        // Determine if the protocol is HTTP or HTTPS and return the corresponding WebSocket URL
        const wsProtocol = url.protocol === "https:" ? "wss://" : "ws://";
        const wsEndpoint = `${wsProtocol}${url.host}/ws`; // Append "/ws" for WebSocket endpoint

        return wsEndpoint;
    }


    // Listen for WebSocket messages
    useEffect(() => {
        const unlisten = listen("ws-message", (event) => {
            setMessages((prev) => [...prev, event.payload]);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);


    useEffect(() => {
        fetchServers(true);
    }, []);

    const fetchServers = async (resetSelection: boolean) => {
        invoke("list_coco_servers")
            .then((res: any) => {
                console.log("list_coco_servers", res);
                setServerList(res);
                if (resetSelection && res.length > 0) {
                    console.log("setCurrentService", res[res.length - 1]);
                    // setCurrentService(res[res.length - 1]);
                } else {
                    console.warn("Service list is empty or last item has no id");
                }
            })
            .catch((err: any) => {
                // setError(err);
                console.error(err);
            });
    };


    // Connect to a server
    const connect = async (server) => {
        let wsEndpoint;
        try {
            //
            // wsEndpoint = convertToWebSocket();
            //
            // console.log("Connecting to server:", wsEndpoint);

            await invoke("connect_to_server", {id: server.id});
            setActiveServer(server.name);
            setIsConnected(true);
            setMessages([]); // Clear previous messages
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    };

    // Disconnect from the current server
    const disconnect = async () => {
        console.log("disconnecting");
        try {
            await invoke("disconnect");
            setIsConnected(false);
            setActiveServer(null);
            console.log("disconnected");
        } catch (error) {
            console.error("Failed to disconnect:", error);
        } finally {
            console.log("disconnecting finally");
        }
    };

    // Switch to another server
    const switchServer = async (server) => {
        try {
            await disconnect();
        } catch (error) {
            // Log or handle the error if needed, but continue with the connection
            console.log("No active connection to disconnect or error while disconnecting:", error);
        } finally {
            console.log("1Switching to server:", server);
        }
        try {
            await connect(server);
        } catch (error) {
            console.log("Failed to connect:", error);
        } finally {
            console.log("2Switching to server:", server);
        }
    };

    return (
        <div>
            <h1>WebSocket Manager</h1>
            {/*<pre>{JSON.stringify(serverList, null, 2)}</pre>*/}

            <div>
                <h3>Select Server</h3>
                {serverList.map((server) => (
                    <button
                        key={server.name}
                        onClick={() => switchServer(server)}
                        disabled={activeServer === server.name}
                    >
                        {activeServer === server.name ? `Connected to ${server.name}` : `Connect to ${server.name}`}
                    </button>
                ))}
            </div>

            {isConnected && (
                <div>
                    <h3>Active Server: {activeServer}</h3>
                    <button onClick={disconnect}>Disconnect</button>

                    <div>
                        <h4>Messages</h4>
                        <ul>
                            {messages.map((msg, index) => (
                                <li key={index}>{msg}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;