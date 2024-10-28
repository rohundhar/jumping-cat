import cliProgress  from 'cli-progress';
import momentTimezone from 'moment-timezone';
import pLimit from "p-limit";
import { getAllMedia, getAllMediaMongo } from "../Mongo/Helpers/media.js";

function eatToUTC(month: number, day: number, hour: number): Date | null {
  try {
      // Create a moment object in EAT. We assume the current year.
      const eatTime = momentTimezone.tz([momentTimezone().year(), month - 1, day, hour], 'Africa/Nairobi');

      // Check if the date is valid
      if (!eatTime.isValid()) {
          return null;
      }

      // Convert to UTC
      return eatTime.utc().toDate();

  } catch (error) {
      return null;
  }
}


const GameDrives = [
  {
    tags: ['game drive'],
    start: eatToUTC(9,25,12),
    end: eatToUTC(9,25,18),
  },
  {
    tags: ['game drive'],
    start: eatToUTC(9,26,7),
    end: eatToUTC(9,26,12),
  },
  {
    tags: ['game drive'],
    start: eatToUTC(9,26,14),
    end: eatToUTC(9,26,19),
  },
  {
    tags: ['game drive'],
    start: eatToUTC(9,27,8),
    end: eatToUTC(9,27,17),
  },
  {
    tags: ['game drive'],
    start: eatToUTC(9,28,14),
    end: eatToUTC(9,28,18),
  },
  {
    tags: ['game drive'],
    start: eatToUTC(9,29,7),
    end: eatToUTC(9,29,19),
  },
  {
    tags: ['game drive'],
    start: eatToUTC(10,1,7),
    end: eatToUTC(10,1,17)
  }
];

const Hotels = [
  {
    tags: ['the boma'],
    start: eatToUTC(9,23,18),
    end: eatToUTC(9,24,9)
  },
  {
    tags: ['retiti house'],
    start: eatToUTC(9,24,9),
    end: eatToUTC(9,25,9)
  }, 
  {
    tags: ['kubu kubu'],
    start: eatToUTC(9,28,17),
    end: eatToUTC(9,29,8)
  },
  {
    tags: ['kubu kubu'],
    start: eatToUTC(9,29,16),
    end: eatToUTC(9,30,8)
  },
  {
    tags: ['entim luxury camp'],
    start: eatToUTC(9,25,12),
    end: eatToUTC(9,28,8)
  },
  {
    tags: ['serena safari lodge'],
    start: eatToUTC(9,30,8),
    end: eatToUTC(10,2,9)
  },
  {
    tags: ['mora'],
    start: eatToUTC(10,2,17),
    end: eatToUTC(10,5,12)
  },
];

const Locations = [
  {
    tags: ['kenya'],
    start: eatToUTC(9,23,12),
    end: eatToUTC(9,28,10)
  },
  {
    tags: ['tanzania'],
    start: eatToUTC(9,28,10),
    end: eatToUTC(10,2,10)
  },
  {
    tags: ['zanzibar'],
    start: eatToUTC(10,2,17),
    end: eatToUTC(10,5,12)
  },
]

const Regions = [

  {
    tags: ['samburu', 'namunyak conservancy'],
    start: eatToUTC(9,24,9),
    end: eatToUTC(9,25,9)
  },
  {
    tags: ['maasai mara'],
    start: eatToUTC(9,25,12),
    end: eatToUTC(9,28,8)
  },
  {
    tags: ['serengeti'],
    start: eatToUTC(9,28,15),
    end: eatToUTC(9,30,9)
  },
  {
    tags: ['ngorongoro crater'],
    start: eatToUTC(9,30,9),
    end: eatToUTC(10,2,9)
  },
]

const CustomTimeline = [
  ...GameDrives,
  ...Hotels,
  ...Locations,
  ...Regions,
  {
    tags: ['arrive in kenya'],
    start: eatToUTC(9, 21, 0),
    end: eatToUTC(9,23,12)
  },
  {
    tags: ['transit'],
    start: eatToUTC(9, 28, 8),
    end: eatToUTC(9,28,15)
  },
  {
    tags: ['transit'],
    start: eatToUTC(10, 2, 9),
    end: eatToUTC(10,2,17)
  },
  {
    tags: ['giraffe sanctuary'],
    start: eatToUTC(9,23,16),
    end: eatToUTC(9,23,20)
  },
  {
    tags: ['elephant sanctuary'],
    start: eatToUTC(9,24,12),
    end: eatToUTC(9,24,18)
  },
  {
    tags: ['maasai tribe', 'maasai village'],
    start: eatToUTC(9,27,8),
    end: eatToUTC(9,27,12)
  },
  {
    tags: ['leave kenya'],
    start: eatToUTC(10,5,13),
    end: eatToUTC(10,7,12)
  },
  {
    tags: ['olduvai gorge', 'cradle of civilization'],
    start: eatToUTC(9,30,15),
    end: eatToUTC(9,30,17)
  }
];

const isBetweenDates = ({start, end, value}: {start: Date, end: Date, value: Date}) => {
  const valueMoment = momentTimezone(value);
  if (!valueMoment.isValid) {
    return false;
  }

  const startMoment = momentTimezone(start);
  const endMoment = momentTimezone(end);

  return valueMoment.isBetween(startMoment, endMoment, undefined, '[]');
}
export const assignCustomTags = async () => {
  const {
    allImages,
    allVideos
  } = await getAllMediaMongo();

  const allMedia = [...allImages, ...allVideos];

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.rect);

  bar.start(allMedia.length, 0);

  const limit = pLimit(10);

  await Promise.all(allMedia.map(async (media) => {
    await limit(async () => { // Wrap the processing function with limit
      try {
        const { fileMetadata } = media;

        const results: string [] = [];
        if (fileMetadata) {
          const { DateTimeOriginal } = fileMetadata;
          if (DateTimeOriginal) {
            CustomTimeline.map((timelineTag) => {
              const { start, end, tags } = timelineTag;
              if (start && end && isBetweenDates({value: DateTimeOriginal, start, end})) {
                results.push(...tags);
              }
            })
          }
        }
        
        media.customTags = results;
        await media.save();
        // console.log(`Results for ${media.gDriveFilename} on ${media.fileMetadata?.DateTimeOriginal?.toISOString()}`, results);
      } catch (error) {
          console.error(`Error processing ${media.gDriveFilename}:${media.mimeType}`, error);
      } finally { 
        bar.increment();
      }
    });
  }));


  bar.stop();



}