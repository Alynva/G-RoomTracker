import { Extension, HDirection, HNavigatorSearchResult, HPacket } from 'gnode-api'

const info = {
	author: "Alynva",
	description: "Track and highlight recently visited rooms to enhance your navigation experience.",
	name: "G-RoomTracker",
	version: "1.0.0"
}

const ext = new Extension(info)

const TIME_TO_FORGOT = 1 * 60 * 60 * 1000 // 1 hour

const visitedRooms = {}

ext.interceptByNameOrHash(HDirection.TOCLIENT, "GetGuestRoomResult", message => {
	const packet = message.getPacket()
	const [_, roomId] = packet.read("bi")
	visitedRooms[roomId] = Date.now()
})

ext.interceptByNameOrHash(HDirection.TOCLIENT, "NavigatorSearchResultBlocks", message => {
	const packet = message.getPacket()
	const result = new HNavigatorSearchResult(packet)
	let found = false

	for (const block of result.blocks) {
		for (const room of block.rooms) {
			const historyRecord = visitedRooms[room.flatId]
			if (!historyRecord) continue

			if (historyRecord > Date.now() - TIME_TO_FORGOT) {
				room.doorMode = 3
				found = true
			} else {
				delete visitedRooms[room.flatId]
			}
		}
	}

	if (found) {
		message.blocked = true
		const newPacket = new HPacket(packet.headerId())
		result.appendToPacket(newPacket)

		ext.sendToClient(newPacket)
	}
})

ext.on("init", () => {
	ext.writeToConsole("G-RoomTracker is working!")
})

ext.run()
