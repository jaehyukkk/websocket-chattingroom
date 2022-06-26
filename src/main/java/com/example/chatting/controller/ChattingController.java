package com.example.chatting.controller;

import com.example.chatting.dto.ChattingRoom;
import com.example.chatting.dto.Message;
import com.example.chatting.service.ChattingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import java.util.*;

import static com.example.chatting.service.ChattingService.chattingRoomLinkedList;

@Controller
public class ChattingController {

    private final ChattingService chattingService;

    public ChattingController(ChattingService chattingService) {
        this.chattingService = chattingService;
    }

    @GetMapping("/")
    public String main() {
        return "main";
    }

    //채팅방 목록
    @GetMapping("/api/chatting-room/list")
    public ResponseEntity<?> chattingRoomList() {
        return new ResponseEntity<LinkedList<ChattingRoom>>(chattingRoomLinkedList, HttpStatus.OK);
    }

    //방 만들기
    @PostMapping("/api/chatting-room")
    public ResponseEntity<?> createChattingRoom(String roomName, String nickname) {

        //방을 만듬
        String roomNumber = UUID.randomUUID().toString();
        ChattingRoom chattingRoom = ChattingRoom.builder()
                .roomName(roomName)
                .roomNumber(roomNumber)
                .users(new LinkedList<>())
                .build();

        //채팅방 목록에 추가
        chattingRoomLinkedList.add(chattingRoom);

        //방에 입장
        chattingService.enterChattingRoom(chattingRoom, nickname);
        return new ResponseEntity<>(chattingRoom, HttpStatus.OK);
    }

    //방 입장
    @GetMapping("/api/chatting-room/enter")
    public ResponseEntity<?> EnterChattingRoom(String roomNumber, String nickname) {
        //방 찾기
        ChattingRoom chattingRoom = chattingService.findRoom(roomNumber);

        if (chattingRoom == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        chattingService.enterChattingRoom(chattingRoom, nickname);
        return new ResponseEntity<>(chattingRoom, HttpStatus.OK);
    }

    //방 퇴장
    @PatchMapping("/api/chatting-room/exit")
    public ResponseEntity<?> exitChattingRoom() {
        Map<String, String> map = chattingService.findCookie();

        if (map == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        String roomNumber = map.get("roomNumber");
        String nickname = map.get("nickname");

        //방목록에서 방번호에 맞는 유저목록 가져오기
        ChattingRoom chattingRoom = chattingService.findRoom(roomNumber);
        List<String> users = chattingRoom.getUsers();

        //닉네임 삭제
        users.remove(nickname);

        //쿠키에서 닉네임과 방번호 삭제
        chattingService.deleteCookie();

        //유저가 한명도 없다면 방 삭제
        if (users.size() == 0) {
            chattingRoomLinkedList.remove(chattingRoom);
        }

        return new ResponseEntity<>(chattingRoom, HttpStatus.OK);
    }

    //참가중이었던 대화방
    @GetMapping("/api/chatting-room")
    public ResponseEntity<?> myChattingRoomList() {
        Map<String, String> map = chattingService.findCookie();

        if (map == null) {
            return new ResponseEntity<>(HttpStatus.OK);
        }

        String roomNumber = map.get("roomNumber");
        String nickname = map.get("nickname");

        ChattingRoom chattingRoom = chattingService.findRoom(roomNumber);

        if (chattingRoom == null) {
            chattingService.deleteCookie();
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } else {
            Map<String, Object> map2 = new HashMap<>();
            map2.put("chattingRoom", chattingRoom);
            map2.put("myNickname", nickname);

            return new ResponseEntity<>(map2, HttpStatus.OK);
        }
    }

    //메세지가 오면 방목록 업데이트
    @MessageMapping("/socket/room-list")
    @SendTo("/topic/room-list")
    public String roomList() {
        return "";
    }

    @MessageMapping("/socket/send-message/{roomNumber}")
    @SendTo("/topic/message/{roomNumber}")
    public Message sendMessage(@DestinationVariable String roomNumber, Message message) {
        return message;
    }

    //채팅방에 입장 퇴장 메세지 보내기
    @MessageMapping("/socket/notification/{roomNumber}")
    @SendTo("/topic/notification/{roomNumber}")
    public Map<String, Object> notification(@DestinationVariable String roomNumber, Map<String, Object> chattingRoom) {
        return chattingRoom;
    }
}
