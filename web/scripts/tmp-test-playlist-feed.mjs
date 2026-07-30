import { fetchOfficialPlaylistAcceptedEpisodes } from "../src/lib/podcast/fetchOfficialPlaylistAcceptedEpisodes.js";

const pl = await fetchOfficialPlaylistAcceptedEpisodes({ maxAccepted: 12 });
console.log("ok", pl.ok, "count", pl.videos?.length, "source", pl.source, "error", pl.error);
if (pl.videos?.[0]) console.log("first", pl.videos[0].title?.slice(0, 70));
