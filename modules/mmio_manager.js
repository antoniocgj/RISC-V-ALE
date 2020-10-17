export class MMIO_Manager{
  constructor(){
    this.slots = [];
    this.slot_size = 0x100;
    this.last_slot = 0xFFFFFFF - this.slot_size;
    this.next_slot = 0;
  }

  getSlot(slot){
    this.slots.push(slot);
  }

  getFreeSlot(){
    while(this.next_slot in this.slots){
      this.next_slot += this.slot_size;
    }
    if(this.next_slot <= this.last_slot){
      this.slots.push(this.next_slot);
      return this.next_slot;
    }
    return -1;
  }
}