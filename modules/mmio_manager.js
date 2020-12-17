export class MMIO_Manager{
  constructor(){
    this.slots = [];
    this.slot_size = 0x200;
    this.last_slot = 0xFFFF - this.slot_size;
    this.next_slot = 0x100;
  }

  getSlot(slot){
    this.slots.push(slot);
  }

  getFreeSlot(){
    while(this.slots.includes(this.next_slot)){
      this.next_slot += this.slot_size;
    }
    if(this.next_slot <= this.last_slot){
      this.slots.push(this.next_slot);
      return this.next_slot;
    }
    return -1;
  }
}