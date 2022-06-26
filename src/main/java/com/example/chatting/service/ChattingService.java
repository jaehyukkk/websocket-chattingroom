package com.example.chatting.service;

import com.example.chatting.dto.ChattingRoom;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Objects;

@Service
public class ChattingService {

    //채팅방 목록
    public static LinkedList<ChattingRoom> chattingRoomLinkedList = new LinkedList<>();

    //방번호로 방 찾기
    public ChattingRoom findRoom(String roomNumber) {
        ChattingRoom room = ChattingRoom.builder()
                .roomNumber(roomNumber)
                .build();

        int index = chattingRoomLinkedList.indexOf(room);

        if (chattingRoomLinkedList.contains(room)) {
            return chattingRoomLinkedList.get(index);
        }
        return null;
    }

    //쿠키에 추가
    public void addCookie(String cookieName, String cookieValue) {
        ServletRequestAttributes attr =
                (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        HttpServletResponse response = attr.getResponse();

        Cookie cookie = new Cookie(cookieName, cookieValue);

        int maxAge = 60 * 60 * 25 * 7;
        cookie.setMaxAge(maxAge);
        Objects.requireNonNull(response).addCookie(cookie);
    }

    //방번호, 닉네임 쿠키 삭제
    public void deleteCookie() {
        ServletRequestAttributes attr =
                (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        HttpServletResponse response = attr.getResponse();

        Cookie roomCookie = new Cookie("roomNumber", null);
        Cookie nicknameCookie = new Cookie("nickname", null);

        roomCookie.setMaxAge(0);
        nicknameCookie.setMaxAge(0);

        response.addCookie(nicknameCookie);
        response.addCookie(roomCookie);
    }

    //쿠키에서 방번호, 닉네임 찾기
    public Map<String, String> findCookie() {
        ServletRequestAttributes attr =
                (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        HttpServletRequest request = attr.getRequest();

        Cookie[] cookies = request.getCookies();
        String roomNumber = "";
        String nickname = "";

        if (cookies == null) {
            return null;
        }

        for (int i = 0; i < cookies.length; i++) {
            if ("roomNumber".equals(cookies[i].getName())) {
                roomNumber = cookies[i].getValue();
            }
            if ("nickname".equals(cookies[i].getName())) {
                nickname = cookies[i].getValue();
            }
        }
        if (!"".equals(roomNumber) && !"".equals(nickname)) {
            Map<String, String> map = new HashMap<>();
            map.put("nickname", nickname);
            map.put("roomNumber", roomNumber);

            return map;
        }
        return null;
    }

    public void createNickname(String nickname) {
        addCookie("nickname", nickname);
    }

    public boolean enterChattingRoom(ChattingRoom chattingRoom, String nickname) {
        createNickname(nickname);

        if (chattingRoom == null) {
            deleteCookie();
            return false;
        }

        LinkedList<String> users = chattingRoom.getUsers();
        users.add(nickname);

        addCookie("roomNumber", chattingRoom.getRoomNumber());
        return true;
    }
}
