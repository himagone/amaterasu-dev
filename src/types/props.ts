export type Props = {
  currentDate: string;
  selectedDateTime: Date;
  onZoomChange?: (zoom: number) => void;
};