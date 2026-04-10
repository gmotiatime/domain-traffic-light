import { Composition } from 'remotion';
import { Presentation } from './Presentation';
import audioUrl from "../FKJ - Let's Live (Official Audio).mp3";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DomainLightPresentation"
        component={Presentation}
        durationInFrames={1500}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          audioUrl
        }}
      />
    </>
  );
};
